# Парсер Links Notation для Kotlin Multiplatform

Реализация парсера Links Notation для Kotlin Multiplatform: рукописный
перенос грамматики эталонного JavaScript-парсера методом рекурсивного спуска,
без зависимостей во время выполнения. Каждый документ, который читает
JavaScript-парсер, она читает в те же связи, а каждый документ, который он
отклоняет, отклоняет в той же строке и колонке.

Платформы: JVM (Java 11+), Android, `iosArm64`, `iosSimulatorArm64`, `iosX64`,
JavaScript (Node.js) и WebAssembly (`wasmJs`).

## Установка

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("io.github.link-foundation.kotlin:links-notation:0.31.3")
}
```

В мультиплатформенном проекте добавьте зависимость в `commonMain`; Gradle сам
выберет артефакт для каждой платформы (`links-notation-jvm`, `-js`,
`-iosarm64`, ...).

### Локальная разработка

```bash
cd kotlin
./gradlew build
```

Платформа Android настраивается, только если найден Android SDK
(`ANDROID_HOME` или `sdk.dir` в `local.properties`), а платформы iOS
собираются только на macOS.

## Тесты

```bash
./gradlew jvmTest jsNodeTest wasmJsNodeTest   # на любой системе
./gradlew iosSimulatorArm64Test               # на macOS
./gradlew testAndroidHostTest                 # при наличии Android SDK
./gradlew ktlintCheck                         # форматирование
bash test-summary.sh                          # тесты по платформам
```

Общие наборы примеров из [`../parity`](../parity) и
[`../docs/protocol`](../docs/protocol) компилируются в каждую тестовую сборку
задачей `generateParityCases`, поэтому нативные платформы, которые не читают
файлы, проверяют те же случаи, что и JVM.

## Использование

### Базовый разбор

```kotlin
import io.github.linkfoundation.linksnotation.Parser
import io.github.linkfoundation.linksnotation.formatLinks

val links = Parser().parse(
    """
    papa (lovesMama: loves mama)
    son lovesMama
    daughter lovesMama
    all (love mama)
    """.trimIndent(),
)

links[0].format()                       // (papa (lovesMama: loves mama))
links[0].format(lessParentheses = true) // papa (lovesMama: loves mama)
formatLinks(links)                      // все четыре связи, по одной в строке
```

### Работа со связями

`Link` - это data-класс: связи с равными идентификаторами и значениями равны.

```kotlin
val parent = Link("parent", listOf(Link("child1"), Link("child2")))
parent.format()                      // (parent: child1 child2)
Link("a").combine(Link("b")).format() // (a b)
escapeReference("has space")         // 'has space'
```

### Параметры форматирования

```kotlin
val link = Link("id", listOf(Link("value1"), Link("value2"), Link("value3")))
link.format(FormatOptions(maxInlineRefs = 2, preferInline = false))
// id:
//   value1
//   value2
//   value3
```

У `FormatOptions` есть также `lessParentheses`, `maxLineLength`,
`indentLongLines`, `groupConsecutive` и `indentString`; `FormatConfig` - тот же
класс под именем из JavaScript.

### Ограничения и ошибки

```kotlin
val parser = Parser(ParserOptions(maxDepth = 1, maxInputSize = null))
parser.parse("(a)")   // принимается
parser.parse("((a))") // DepthExceeded: limit 1, строка 1, колонка 2
```

У `ParserOptions` есть `maxDepth` (по умолчанию 64, как во всех реализациях),
`maxInputSize` (`null`: 10 МиБ в кодовых единицах UTF-16), `comments` (начинает
ли `#` комментарий) и `syntax` (запоминают ли связи, как были записаны их
идентификаторы). `ParseException` - запечатанный класс:

- `ParseException.Syntax` - документ не является Links Notation; `line`,
  `column`, `offset`, `lineText`, `snippet` и `found` указывают место;
- `ParseException.DepthExceeded` - ошибка `Syntax` для связей, вложенных
  глубже `limit`;
- `ParseException.InputTooLarge` - документ длиннее `limit`; он не читается.

### Как записан документ (CST)

```kotlin
val link = Parser().parse("(t 1 '1')").single()
val bare = link.values[1]
val quoted = link.values[2]
bare == quoted // true: это одна и та же ссылка
bare.rawId     // "1", а bare.quote равно null
quoted.rawId   // "'1'", а quoted.quote равно "'"
link.format()  // (t 1 1)

val cst = Parser().parseCst("(t 1 '1') # note\n")
cst.toString()      // "(t 1 '1') # note\n"
cst.toSExpression() // (document (line (group open_paren:"(" ...
```

`ParserOptions(syntax = false)` (режим AST) оставляет `rawId` равным null.

### Потоковый разбор

`StreamParser` принимает произвольные фрагменты и публикует запись верхнего
уровня, как только начинается следующая:

```kotlin
val stream = StreamParser(collect = false).onLink { println(it.format()) }
stream.write("profile:\n  name Ada\n") // пока ничего: ждём дочерние строки
stream.end("next link")                // (profile: (name Ada)), затем (next link)

StreamParser.parse(listOf("a b\n", "c d")) // ленивая Sequence<Link>
```

У потока есть `position()`, `drain()`, `reset()` и `maxBufferSize`, а
`onError`/`onEnd` регистрируют другие обработчики.

### Группы и документы с отступами

```kotlin
val group = Parser().parseGroups("parent\n  child1\n  child2").single()
group.children.size // 2
group.toString()    // ((parent)) ((child1)) ((child2))

val document = parseIndentedDocument("fruits\n  apple\n  pear\n")
// {fruits=[apple, pear]}
formatIndentedDocument(document) // "fruits\n  apple\n  pear\n"
```

Для отступного ID, например `x:\n  a\n  b`, элемент `x:` имеет пустой
список значений, а его дети — ссылки `a` и `b`. Свёртка детей в значения
элемента даёт `(x: a b)`, как канонический `parse`. Явное `(a)` сохраняет
связь с одним значением; обычный заголовок `x: kind` сохраняет прежние
дочерние связи и развёртку путей. Начиная с 0.30.2, ссылка в листе доступна
как `child.element`, а не `child.element.values[0]`.

### Двоичный кодек

```kotlin
val codec = BinaryLinoCodec()
val bytes = codec.encodeText("(papa loves mama)")
codec.decodeText(bytes) // papa loves mama
```

`BinaryLinoOptions` выбирает внешние ссылки Hybrid, диапазоны арности и
упакованные ширины; `DecodeLimits` ограничивает декодируемое. `LinksPacket`,
`PacketReader` и `formatBinaryReference` - нижние уровни. Формат описан в
[`../docs/protocol`](../docs/protocol).

## Отличия от JavaScript API

Поведение то же самое; форма следует соглашениям Kotlin:

- Ошибки - это `ParseException.Syntax`, `ParseException.DepthExceeded`,
  `ParseException.InputTooLarge` и `StreamParseException`, которые хранят
  позицию в свойствах. Недопустимые аргументы бросают
  `IllegalArgumentException`, а неверное использование -
  `IllegalStateException`, с сообщениями из JavaScript.
- Двоичный уровень использует ссылки `ULong`, пакеты `ByteArray` и
  запечатанный `PacketReference` (`Address`, `External`).
- `FormatConfig` - это `typealias` для `FormatOptions`.
- `parseIndentedDocument` возвращает `Map<String, List<String>>`: у родителя с
  одним дочерним элементом список из одного элемента там, где JavaScript даёт
  текст этого элемента.
- У `StreamParser` нет `parseAsync`; `onLink`, `onError` и `onEnd` принимают
  функции Kotlin, а `StreamParser.parse` возвращает ленивую `Sequence`.
- Дочерние элементы `LinksGroup` - это `LinksGroup`; `escapeReference`,
  `unescapeReference` и `referenceQuote` - функции верхнего уровня.
- Связи сравниваются через `==`.

## Информация о пакете

- Пакет: `io.github.linkfoundation.linksnotation`
- Координаты Maven: `io.github.link-foundation.kotlin:links-notation`
- Лицензия: Unlicense
