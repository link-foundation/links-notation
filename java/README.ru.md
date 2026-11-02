# Парсер Links Notation для Java

Java-реализация парсера Links Notation.

## Установка

### Maven

Добавьте зависимость в ваш `pom.xml`:

```xml
<dependency>
    <groupId>io.github.link-foundation</groupId>
    <artifactId>links-notation</artifactId>
    <version>0.28.0</version>
</dependency>
```

### Gradle

Добавьте зависимость в ваш `build.gradle`:

```groovy
implementation 'io.github.link-foundation:links-notation:0.28.0'
```

### Локальная разработка

Для разработчиков, работающих с исходным кодом:

```bash
cd java
./mvnw install
```

## Сборка

Сборка проекта:

```bash
./mvnw clean compile
```

## Тестирование

Запуск тестов:

```bash
./mvnw test
```

## Использование

### Базовый парсинг

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;

import java.util.List;

public class Example {
    public static void main(String[] args) throws Exception {
        // Создание парсера
        Parser parser = new Parser();

        // Парсинг строки в формате Lino
        String input = """
            papa (lovesMama: loves mama)
            son lovesMama
            daughter lovesMama
            all (love mama)
            """;

        List<Link> result = parser.parse(input);

        // Доступ к структуре
        for (Link link : result) {
            System.out.println(link.toString());
        }
    }
}
```

### Работа со связями

```java
import io.github.linkfoundation.linksnotation.Link;

import java.util.Arrays;
import java.util.List;

// Создание связей программно
Link child1 = new Link("child1");
Link child2 = new Link("child2");
Link parent = new Link("parent", Arrays.asList(child1, child2));

System.out.println(parent.toString()); // (parent: child1 child2)

// Доступ к свойствам связи
System.out.println("ID: " + parent.getId());
System.out.println("Значения: " + parent.getValues());
```

### Продвинутое использование

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.LinksGroup;

// Работа с вложенными структурами
String input = """
    parent
      child1
      child2
        grandchild1
        grandchild2
    """;

Parser parser = new Parser();
List<Link> parsed = parser.parse(input);

// Работа с группами
LinksGroup group = new LinksGroup(parsed);
System.out.println(group.format());
```

### Потоковый разбор

`StreamParser` принимает произвольные порции и вызывает `Consumer<Link>` только
для завершённых связей верхнего уровня. Отключите накопление для обработки с
ограниченной памятью.

```java
StreamParser stream = new StreamParser()
    .collect(false)
    .onLink(System.out::println);
stream.write("профиль:\n  имя Ада\n");
stream.finish("следующая связь");
```

`StreamParser.parseChunks(chunks)` предоставляет ленивый `Stream<Link>`. На
самом парсере также доступны позиция, drain, reset и ограничение буфера.

## Примеры синтаксиса

### Дублеты (2-кортеж)

```lino
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)
```

### Триплеты (3-кортеж)

```lino
papa has car
mama has house
(papa and mama) are happy
```

### N-кортежи со ссылками

```lino
(linksNotation: links notation)
(This is a linksNotation as well)
(linksNotation supports (unlimited number (of references) in each link))
```

### Отступы

```lino
parent
  child1
  child2
    grandchild1
    grandchild2
```

### Синтаксис с ID и отступами

```lino
3:
  papa
  loves
  mama
```

Это эквивалентно:

```lino
(3: papa loves mama)
```

### Многострочные группы

Скобочная группа открывает *вложенный контекст*: её тело начинается заново с
нулевого уровня отступа и подчиняется тем же правилам, что и корень документа,
поэтому перенос строки внутри скобок — это структура, а не оформление.

```lino
value (
  id "1"
  label "one"
)
```

Документ выше разбирается в `(value ((id 1) (label one)))` — два потомка,
каждый из которых сам является связью, — а не в один плоский список, в котором
граница между `id` и `label` была бы потеряна. Тело, умещающееся в одну строку,
по-прежнему сворачивается в одну связь, так что `(a b c)` не меняется.

```java
String input = """
    value (
      id "1"
      label "one"
    )
    """;

List<Link> links = new Parser().parse(input);
System.out.println(links.get(0).format(false)); // (value ((id 1) (label one)))
```

### Комментарии

`#` скрывает остаток строки, на которой стоит, поэтому документ может нести
пояснения о самом себе:

```lino
# машины, на которые идёт выкладка
deploy: staging # пока только staging
```

К моменту чтения документа обоих комментариев уже нет, остаётся одна связь
`(deploy: staging)`. `#` открывает комментарий только там, где могла бы
начаться ссылка, поэтому `#` внутри токена (`issue#1047`) и `#` внутри ссылки
в кавычках (`"#"`) остаются обычными символами.

Форматтер соблюдает то же правило с другой стороны: ссылка, начинающаяся с `#`,
записывается в кавычках (`'#tag'`), поэтому написанный им документ читается
обратно как он сам.

Комментарии включены по умолчанию, а парсеру можно велеть снова читать `#` как
обычный символ - для документов, написанных до появления комментариев:

```java
String document = "# машины, на которые идёт выкладка\ndeploy: staging # пока только staging\n";
System.out.println(new Parser().parse(document).get(0).format(false)); // (deploy: staging)

System.out.println(new Parser(false).parse("# a b\n").get(0).format(false)); // (# a b)
```

### Как документ был записан (CST)

Парсер сохраняет, как была записана каждая ссылка. Кавычки не меняют ссылку:
`1` и `'1'` - одна и та же ссылка, поэтому `equals`, `hashCode`, `toString` и
`format` остаются прежними. Каждая разобранная связь хранит `getRawId()` - ID в
точности так, как он записан, и `getQuote()` - кавычку, в которую он заключён:

```java
Link link = new Parser().parse("(t 1 '1')").get(0);
Link bare = link.getValues().get(1);
Link quoted = link.getValues().get(2);
bare.equals(quoted); // true: это одна ссылка
bare.getRawId(); // "1", а bare.getQuote() равен null
quoted.getRawId(); // "'1'", а quoted.getQuote() равен "'"
link.format(false); // (t 1 1)
```

`getRawId()` равен `null` у связей без ID, у связей, созданных в коде, и у
связей, построенных объединением путей по отступам. `new Parser(true, false)`
(режим AST) не сохраняет его. `StreamParser` его сохраняет.

`parseCst(input)` возвращает конкретное синтаксическое дерево без потерь:
каждый символ, включая комментарии, пустые строки, отступы, кавычки и
переводы строк, принадлежит ровно одному токену, поэтому исходный текст
всегда восстанавливается: `new Parser().parseCst(text).toString()` равно
`text`. Узел `document` содержит узлы `line`; строка содержит свои токены
вместе с переводом строки; узел `group` содержит `(`, строки внутри и `)`.
Токены ссылок хранят `getValue()` (что означает ссылка) и `getQuote()`.
`parseCst` отклоняет то, что отклоняет `parse`, а также несбалансированные
скобки (`(a`, `a)`), которые `parse` читает снисходительно. Подробности - в
[разборе issue 364](../docs/case-studies/issue-364/README.md).

## Справочник API

### Классы

#### `Parser`

Основной класс парсера для преобразования строк в связи.

- `Parser()` - Создать парсер с настройками по умолчанию
- `Parser(int maxInputSize, int maxDepth)` - Создать парсер с пользовательскими лимитами
- `Parser(boolean comments)` - Создать парсер, читающий `#` как обычный символ,
  если `comments` равно `false`
- `Parser(int maxInputSize, int maxDepth, boolean comments)` - Создать парсер и с тем, и с другим
- `Parser(boolean comments, boolean syntax)` и
  `Parser(int maxInputSize, int maxDepth, boolean comments, boolean syntax)` - Со
  значением `syntax`, равным `false` (режим AST), связи не хранят `getRawId()`
- `parse(String input)` - Распарсить строку Lino и вернуть связи
- `parseCst(String input)` - Конкретное синтаксическое дерево без потерь (`CstNode`)
- `isSyntaxEnabled()` - Сохраняют ли разобранные связи, как записаны их ID
- `getMaxDepth()` - Насколько глубоко могут быть вложены связи
- `Parser.DEFAULT_MAX_DEPTH` - Значение `maxDepth` по умолчанию, 64, одинаковое
  во всех реализациях

`maxInputSize` - наибольший принимаемый документ в символах (по умолчанию:
`10 * 1024 * 1024`).

`maxDepth` - насколько глубоко могут быть вложены связи (по умолчанию: 64).
Каждая группа в скобках и каждый уровень отступа - это один уровень, а строки
документа начинаются с уровня 0, поэтому при `maxDepth`, равном 1, `(a)`
принимается, а `((a))`, `(a (b))` и группа на строке с отступом отклоняются.
Документ с более глубокой вложенностью отклоняется с
`NestingTooDeepException`, а не разбирается рекурсивно, пока не кончится стек.

#### `Link`

Представляет отдельную связь с ID и значениями.

- `Link()` - Создать пустую связь
- `Link(String id)` - Создать связь с ID
- `Link(String id, List<Link> values)` - Создать связь с ID и значениями
- `getId()` - Получить идентификатор связи
- `getValues()` - Получить список дочерних значений/связей
- `toString()` - Преобразовать связь в строку
- `format(boolean lessParentheses)` - Форматировать с опциональным сокращением скобок
- `equals(Object other)` - Проверить равенство с другой связью
- `static formatLinks(List<Link> links)` - Форматировать список связей
- `getRawId()` / `setRawId(String rawId)` - ID в точности так, как он записан в
  разобранном документе, или `null`; не влияет на `equals`, `hashCode`,
  `toString` и `format`
- `getQuote()` - `'`, `"` или `` ` ``, если `getRawId()` в кавычках, иначе `null`
- `static referenceQuote(String raw)` - Кавычка одной целой ссылки в кавычках,
  иначе `null`

#### `CstNode` и `CstKind`

Узел или токен конкретного синтаксического дерева, которое возвращает `parseCst`.

- `getKind()` - `CstKind`: `DOCUMENT`, `LINE`, `GROUP`, `WHITESPACE`, `NEWLINE`,
  `COMMENT`, `OPEN_PAREN`, `CLOSE_PAREN`, `COLON` или `REFERENCE`; его
  `toString()` - общее для всех реализаций имя в S-выражении (`open_paren`, ...)
- `getChildren()` - Дочерние элементы узла; пусто у токена
- `getText()` / `toString()` - Точный текст, из которого он прочитан
- `getValue()`, `getQuote()` - Значение и кавычка токена ссылки
- `isToken()`, `tokens()` - Токен ли это, и все токены по порядку
- `toSExpression()` - Дерево в виде `(kind child ...)`, токены - `kind:"text"`

#### `LinksGroup`

Контейнер для группировки связанных связей.

- `LinksGroup()` - Создать пустую группу
- `LinksGroup(List<Link> links)` - Создать группу со связями
- `add(Link link)` - Добавить связь в группу
- `getLinks()` - Получить список связей
- `size()` - Получить количество связей
- `isEmpty()` - Проверить, пуста ли группа
- `format()` - Форматировать группу как строку

#### `ParseException`

Исключение, выбрасываемое при ошибке парсинга.

#### `NestingTooDeepException`

Наследник `ParseException`, который выбрасывается, когда связи в документе
вложены глубже `maxDepth`. Он указывает на группу или строку, которая на один
уровень глубже допустимого:

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

- `getMaxDepth()` - Наибольшая вложенность, которую принимает парсер
- `getLine()`, `getColumn()` - Где начинается слишком глубокая группа или
  строка, считая с 1
- `getOffset()` - Та же позиция в виде смещения в символах от начала документа
- `getLineText()` - Строка с ошибкой в том виде, в каком она написана
- `getSummary()` - Первая строка сообщения без `Nesting too deep at`
- `getSnippet()` - Строка с указателем под нужным столбцом

`StreamParser` сообщает о той же ошибке через исключение `StreamParseException`,
причиной которого является `NestingTooDeepException`, а строка, столбец и
смещение отсчитываются от начала потока.

## Структура проекта

- `src/main/java/io/github/linkfoundation/linksnotation/Link.java` - Структура данных Link
- `src/main/java/io/github/linkfoundation/linksnotation/LinksGroup.java` - Контейнер группы связей
- `src/main/java/io/github/linkfoundation/linksnotation/Parser.java` - Реализация парсера
- `src/main/java/io/github/linkfoundation/linksnotation/CstNode.java`, `CstKind.java`,
  `CstBuilder.java` - Конкретное синтаксическое дерево без потерь
- `src/main/java/io/github/linkfoundation/linksnotation/ParseException.java` - Исключение парсинга
- `src/main/java/io/github/linkfoundation/linksnotation/NestingTooDeepException.java` - Исключение
  слишком глубокой вложенности
- `src/test/java/` - Тестовые файлы

## Поддержка

### Форматирование кода

Проект использует Google Java Format через Spotless:

```bash
./mvnw spotless:apply
```

Проверка форматирования:

```bash
./mvnw spotless:check
```

## Требования

- Java 21 или выше
- Maven 3.6.3 или новее (минимум, который принимают плагины сборки; `pom.xml` проверяет его,
  а CI собирает проект этой версией). `./mvnw` загружает
  Maven, которым собирается этот репозиторий (3.10.0, указан в `.mvn/wrapper/maven-wrapper.properties`)

## Информация о пакете

- Group ID: `io.github.link-foundation`
- Artifact ID: `links-notation`
- Лицензия: Unlicense (см. [LICENSE](../LICENSE))
