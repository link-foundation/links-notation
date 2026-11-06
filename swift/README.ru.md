# Парсер Links Notation для Swift

[![Actions Status](https://github.com/link-foundation/links-notation/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/links-notation/actions/workflows/js.yml)
[![GitHub release](https://img.shields.io/github/v/tag/link-foundation/links-notation?filter=%5B0-9%5D*&label=SwiftPM)](https://github.com/link-foundation/links-notation/tags)

Реализация парсера и форматтера нотации связей (Links Notation, lino) от Link
Foundation на Swift. Она не зависит ни от чего, кроме стандартной библиотеки
Swift (даже от Foundation), требует Swift 5.9 или новее и работает в macOS 13+,
iOS 16+ и Linux.

## Установка

Пакет распространяется через Swift Package Manager. `Package.swift` лежит в
корне этого репозитория, а каждый выпуск помечен тегом с номером версии без
префикса, поэтому добавьте репозиторий в зависимости своего пакета:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/link-foundation/links-notation.git", from: "0.31.2"),
],
targets: [
    .target(
        name: "YourTarget",
        dependencies: [.product(name: "LinksNotation", package: "links-notation")]),
]
```

В Xcode выберите **File > Add Package Dependencies...** и введите
`https://github.com/link-foundation/links-notation.git`.

[`examples/swift`](../examples/swift) - полный пакет, зависящий от этого; CI
собирает и запускает его.

## Быстрый старт

```swift
import LinksNotation

// Разобрать нотацию связей
let links = try Parser().parse("papa (lovesMama: loves mama)")

// Отформатировать обратно в строку
print(formatLinks(links))  // (papa (lovesMama: loves mama))
```

## Возможности

- Разбор нотации связей (lino) в структурированные значения `Link`
- Форматирование значений `Link` обратно в нотацию
- Встроенный и отступный синтаксис
- Комментарии `#`, включённые по умолчанию и отключаемые
- Разобранные связи помнят, как были записаны их идентификаторы (`rawId`,
  `quote`), а `parseCst` даёт конкретное синтаксическое дерево без потерь
- Ссылки в кавычках со специальными символами
- Строки в тройных кавычках для вложенных кавычек
- Настраиваемое форматирование через `FormatOptions` (оно же `FormatConfig`)
- Потоковый разбор через `StreamParser` из `Sequence` или `AsyncSequence`
  фрагментов
- Отступные документы через `parseIndentedDocument`
- Двоичная нотация связей через `BinaryLinoCodec`
- Полная совместимость с остальными восемью реализациями (JavaScript, Rust,
  Python, Java, Go, C#, PHP, C++)

## Справочник API

### Link

```swift
public struct Link: Hashable, Sendable, CustomStringConvertible {
    public var id: String?
    public var values: [Link]
    public var rawId: String?   // идентификатор в том виде, в каком его прочитал парсер
    public var quote: String?   // кавычка, в которую был заключён rawId

    public init(id: String? = nil, values: [Link] = [], rawId: String? = nil)
    public func format(lessParentheses: Bool = false) -> String
    public func format(options: FormatOptions) -> String
    public func simplify() -> Link
    public func combine(_ other: Link) -> Link
}
```

Представляет связь в нотации. Связь может быть:

- Ссылкой (только идентификатор, без значений)
- Связью с идентификатором и значениями
- Связью только со значениями (без идентификатора)

Связи сравниваются через `==` без учёта `rawId`, а `description` равно
`format()`.

### Функции

```swift
public func formatLinks(_ links: [Link], lessParentheses: Bool = false) -> String
public func formatLinks(_ links: [Link], options: FormatOptions) -> String
public func escapeReference(_ reference: String?, minimal: Bool = false) -> String
public func unescapeReference(_ reference: String) throws -> String
```

### Parser

```swift
let parser = Parser(options: ParserOptions(maxDepth: 16))
let links: [Link] = try parser.parse(document)
let groups: [LinksGroup] = try parser.parseGroups(document)
let cst: CstNode = try parser.parseCst(document)
```

`ParserOptions` содержит:

- `maxDepth` - Допустимая глубина вложенности (по умолчанию `defaultMaxDepth`,
  то есть 64); см. [Глубина вложенности](#глубина-вложенности)
- `maxInputSize` - Наибольшая длина документа в кодовых единицах UTF-16 (по
  умолчанию `nil`, то есть `defaultMaxInputSize`, 10 МиБ); на более длинный
  бросается `ParseError.inputTooLarge`
- `comments` - Начинает ли `#` комментарий (по умолчанию `true`)
- `syntax` - Записывают ли разобранные связи в `rawId`, как были записаны их
  идентификаторы (по умолчанию `true`); `false` - это режим AST

`parse` бросает `ParseError`; `parseLocated` читает те же связи, но бросает
`LocatedParseError`, который ещё и сообщает, где документ не разобрался
(`line`, `column`, `offset`, `found`, `lineText` и `snippet`). Строки и столбцы
считаются с 1, а столбцы и смещения - в кодовых единицах UTF-16, как в
JavaScript.

`parseGroups` хранит связь каждой строки вместе со строками, вложенными под неё
отступом, как `LinksGroup(element, children:)`.

Для отступного ID, например `x:\n  a\n  b`, элемент `x:` имеет пустой
список значений, а его дети — ссылки `a` и `b`. Свёртка детей в значения
элемента даёт `(x: a b)`, как канонический `parse`. Явное `(a)` сохраняет
связь с одним значением; обычный заголовок `x: kind` сохраняет прежние
дочерние связи и развёртку путей. Начиная с 0.30.2, ссылка в листе доступна
как `child.element`, а не `child.element.values[0]`.

### Синтаксические метаданные и конкретное синтаксическое дерево

Разобранная связь помнит, как был записан её идентификатор. `rawId` - это
идентификатор ровно в том виде, в каком он записан в документе, вместе с
кавычками, удвоенными сериями кавычек и литералами `~1{...}`, а `quote` - его
разделитель (`'`, `"` или `` ` ``), когда он является одной законченной ссылкой
в кавычках. Сравнение, хеширование и форматирование их не учитывают, поэтому
`1` и `'1'` остаются одной и той же ссылкой:

```swift
let link = try Parser().parse("(t 1 '1')")[0]
// link.values[1].rawId == "1",   link.values[1].quote == nil
// link.values[2].rawId == "'1'", link.values[2].quote == "'"
// link.values[1] == link.values[2], и link.format() == "(t 1 1)"
```

У связей, созданных в коде, связей без идентификатора и связей, полученных
объединением отступного пути, `rawId` нет. `parseGroups` и `StreamParser` его
сохраняют, а `ParserOptions(syntax: false)` (режим AST) отбрасывает.
`referenceQuote(_:)` так же читает разделитель любой записанной ссылки.

`parseCst` читает конкретное синтаксическое дерево без потерь: каждый символ
принадлежит ровно одному токену, поэтому `description` возвращает документ
в точности, вместе с комментариями, пробелами и концами строк. Он бросает то
же, что бросил бы `parse` для того же документа.

```swift
let cst = try Parser().parseCst("a '1' # note\n")
// cst.description == "a '1' # note\n"
// cst.toSExpression() ==
//   (document (line reference:"a" whitespace:" " reference:"'1'"
//     whitespace:" " comment:"# note" newline:"\n"))
```

У `CstNode` есть `kind` (`.document`, `.line` или `.group` у узлов и
`.whitespace`, `.newline`, `.comment`, `.openParen`, `.closeParen`, `.colon` или
`.reference` у токенов), `children`, а у токена-ссылки ещё его раскодированное
значение `value` и `quote`. Его читают `text`, `tokens()`, `isToken` и
`toSExpression()`.

### FormatOptions

```swift
let options = FormatOptions(maxLineLength: 20, indentLongLines: true, preferInline: false)
print(formatLinks(try Parser().parse("(record: first second third fourth)"), options: options))
// record:
//   first
//   second
//   third
//   fourth
```

Параметры: `lessParentheses`, `maxLineLength` (по умолчанию 80),
`indentLongLines`, `maxInlineRefs`, `groupConsecutive`, `indentString` (по
умолчанию два пробела) и `preferInline` (по умолчанию `true`).

### Потоковый разбор

`StreamParser` принимает произвольные фрагменты, которые могут обрываться
посреди строки или ссылки, и выдаёт законченные связи верхнего уровня через
результат каждого `write` и через `onLink`:

```swift
let stream = StreamParser()
_ = stream.onLink { print($0) }
for chunk in ["papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"] {
    _ = try stream.write(chunk)
}
_ = try stream.end()
// (papa (lovesMama: loves mama))
// (son lovesMama)
```

Для долгоживущих потоков есть `onError`, `onEnd`, `position()`, `drain()`,
`reset()` и `StreamParserOptions(maxBufferSize:collect:)`.
`StreamParser.parse` читает все связи из `Sequence` фрагментов или выдаёт связи
из `AsyncSequence` фрагментов как `AsyncThrowingStream`:

```swift
for link in try StreamParser.parse(["a b\nc", " d\n"]) { print(link) }
// (a b)
// (c d)
```

### Отступные документы

`parseIndentedDocument` читает текстовых родителей и их непосредственных
текстовых потомков, а `formatIndentedDocument` записывает их обратно с
минимальным использованием кавычек:

```swift
let document = try parseIndentedDocument("colors\n  red\n  'light blue'\nempty\n")
// ["colors": .list(["red", "light blue"]), "empty": .list([])]
print(formatIndentedDocument(document), terminator: "")
```

Передайте `IndentedDocumentOptions(multipleValues: .join)`, чтобы соединить
нескольких потомков в одно значение, по потомку на строку.

### Двоичная нотация связей

`BinaryLinoCodec` записывает документы в
[двоичной нотации связей](../docs/protocol/binary-links-notation.md) и читает их
обратно без изменений, байт в байт как остальные реализации:

```swift
let codec = BinaryLinoCodec()
let bytes: [UInt8] = try codec.encodeText("papa (lovesMama: loves mama)")
print(try codec.decodeText(bytes))  // papa (lovesMama: loves mama)

// Возможности версии 2: внешние ссылки, диапазон арностей, упакованные ширины.
let v2 = BinaryLinoCodec(
    options: BinaryLinoOptions(
        externalReferences: true, arity: try ArityRange.parse("2..3"), packedWidths: true))
```

`encode` и `decode` работают с `[Link]`, а `encodePacket` и `decodePacket` - с
самой структурой `LinksPacket`. На неправильные данные бросается `BinaryError`,
а `DecodeLimits` ограничивает то, что принимает декодер.

## Примеры

### Простой разбор

```swift
let parser = Parser()

// Разобрать простую связь
var links = try parser.parse("(papa has car)")

// Разобрать связь с идентификатором и значениями
links = try parser.parse("(address: source target)")

// Разобрать несколько связей
links = try parser.parse("(papa has car)\n(mama has house)")
```

### Ссылки в кавычках

```swift
// Ссылкам с пробелами нужны кавычки
var links = try Parser().parse("(\"New York\": city state)")

// Специальные символы
links = try Parser().parse("('key:with:colons': 'value')")
```

### Отступный синтаксис

```swift
// Отступная запись равнозначна встроенной
let indented = try Parser().parse("id:\n  value1\n  value2")
let inline = try Parser().parse("(id: value1 value2)")

// Обе дают одинаковый результат
assert(indented == inline)
```

### Своё форматирование

```swift
let link = Link(id: "id", values: [Link(id: "value1"), Link(id: "value2")])

// Режим с меньшим числом скобок
print(link.format(lessParentheses: true))  // id: value1 value2
```

## Обзор синтаксиса

### Дуплеты (2-кортежи)

```lino
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
```

### Триплеты (3-кортежи)

```lino
papa has car
mama has house
(papa and mama) are happy
```

### Последовательности (N-кортежи)

```lino
I'm a friendly AI.
(I'm a friendly AI too.)
(linksNotation: links notation)
```

### Отступный синтаксис

```lino
3:
  papa
  loves
  mama
```

Равнозначно: `(3: papa loves mama)`

### Многострочные группы

Группа в скобках открывает *вложенный контекст*: её тело начинается заново с
нулевого уровня отступа и подчиняется тем же правилам, что и корень документа,
поэтому перевод строки внутри скобок - это структура, а не оформление.

```lino
value (
  id "1"
  label "one"
)
```

Этот документ разбирается в `(value ((id 1) (label one)))` - два потомка, каждый
из которых сам является связью, - а не в один плоский список, где граница между
`id` и `label` потерялась бы. Тело, оставшееся на одной строке, по-прежнему
сворачивается в одну связь, так что `(a b c)` не меняется.

```swift
let links = try Parser().parse("value (\n  id \"1\"\n  label \"one\"\n)")
print(formatLinks(links))  // (value ((id 1) (label one)))
```

### Комментарии

`#` скрывает остаток своей строки, так что документ может содержать пояснения о
самом себе:

```lino
# the machines this deploys to
deploy: staging # only staging, for now
```

К моменту чтения документа оба комментария исчезают, и остаётся одна связь
`(deploy: staging)`. `#` открывает комментарий только там, где могла бы
начаться ссылка, поэтому `#` внутри токена (`issue#1047`) и внутри ссылки в
кавычках (`"#"`) остаётся обычным символом.

Форматтер соблюдает то же правило с другой стороны: ссылка, начинающаяся с `#`,
записывается в кавычках (`'#tag'`), так что записанный им документ читается
обратно в самого себя.

Комментарии включены по умолчанию, и парсеру можно велеть снова читать `#` как
обычный символ - для документов, написанных до появления комментариев:

```swift
let links = try Parser().parse("# the machines this deploys to\ndeploy: staging # only staging, for now\n")
print(formatLinks(links))  // (deploy: staging)

let plain = try Parser(options: ParserOptions(comments: false)).parse("# a b\n")
print(formatLinks(plain))  // ('#' a b)
```

### Глубина вложенности

Каждая группа в скобках и каждый уровень отступа - это один уровень
вложенности; строки документа находятся на уровне 0, а отступ внутри группы
отсчитывается поверх уровня самой группы. Парсер углубляет рекурсию на каждом
уровне, поэтому документ, вложенный глубже `maxDepth` (по умолчанию
`defaultMaxDepth`, то есть 64), он отвергает с ошибкой, а не рекурсивно
исчерпывает стек, что завершило бы весь процесс.

`parse` бросает `ParseError.depthExceeded(maxDepth)`, а `parseLocated` -
`LocatedParseError`, указывающий на группу или строку, которая на уровень
глубже допустимого:

```swift
do {
    _ = try Parser(options: ParserOptions(maxDepth: 3)).parseLocated("((((a))))")
} catch let error as LocatedParseError {
    print(error.line!, error.column!)  // 1 4
    print(error.message)
}
```

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

`StreamParser` использует параметры, с которыми он создан, и оборачивает ошибку
в `StreamParseError`, у которого `offset`, `line` и `column` отсчитываются от
начала потока.

## Тестирование

Из корня репозитория:

```bash
swift build --build-tests -Xswiftc -warnings-as-errors
swift test --parallel
swift format lint --strict --recursive Package.swift swift examples/swift
```

Тесты используют XCTest и читают общие эталонные данные из папок `parity/` и
`docs/` репозитория. Укажите в `LINKS_NOTATION_VECTORS` вывод
`node experiments/issue-369/differential-vectors.mjs`, чтобы сравнить парсер с
эталонной реализацией на JavaScript на случайных документах.

## Лицензия

[Unlicense](../LICENSE)

Точные идентификаторы и значения Unicode проходят полный круг по
[контракту литералов ссылок](../docs/protocol/reference-literals.md), включая
смешанные кавычки, пустые строки, управляющие символы и многострочный текст.
