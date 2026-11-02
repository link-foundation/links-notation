# Парсер Links Notation для Go

[![Actions Status](https://github.com/link-foundation/links-notation/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/links-notation/actions/workflows/js.yml)
[![Go Reference](https://pkg.go.dev/badge/github.com/link-foundation/links-notation/go.svg)](https://pkg.go.dev/github.com/link-foundation/links-notation/go)

Реализация парсера и форматтера нотации связей (lino) на Go.

## Установка

```bash
go get github.com/link-foundation/links-notation/go
```

## Быстрый старт

```go
package main

import (
    "fmt"
    "log"

    lino "github.com/link-foundation/links-notation/go"
)

func main() {
    // Разбор нотации связей
    links, err := lino.Parse("папа (любитМаму: любит маму)")
    if err != nil {
        log.Fatal(err)
    }

    // Форматирование обратно в строку
    output := lino.Format(links)
    fmt.Println(output)
}
```

## Возможности

- Разбор нотации связей (lino) в структуры `Link`
- Форматирование `Link` обратно в нотацию связей
- Поддержка однострочного синтаксиса и синтаксиса с отступами
- Комментарии `#`, включённые по умолчанию и отключаемые
- Строки в кавычках со специальными символами
- Строки в тройных кавычках для вложенных кавычек
- Настраиваемое форматирование через `FormatConfig`
- Полная совместимость с остальными шестью реализациями

## Потоковый разбор

`StreamParser` принимает произвольные строковые или байтовые порции и выдаёт
завершённые связи верхнего уровня через возвращаемые срезы или `OnLink`.
Отключите накопление, чтобы callback хранил только незавершённую запись.

```go
stream := lino.NewStreamParser()
stream.Collect = false
stream.OnLink = func(link *lino.Link) { fmt.Println(link) }
stream.Feed("профиль:\n  имя Ада\n")
stream.Finish("следующая связь")
```

Парсер реализует `io.Writer`, а `ParseChunks` предоставляет ленивый `iter.Seq2`.
Для долгоживущих потоков доступны `Position`, `Drain`, `Reset` и `MaxBufferSize`.

## Как документ был записан

Разобранная связь хранит в `RawID` ID в точности так, как он записан в
документе, а `Quote()` выводит из него кавычку. `1` и `'1'` - по-прежнему одна
и та же ссылка: `Equal`, `String`, `Format` и `FormatWithConfig` не учитывают
`RawID`.

```go
links, _ := lino.Parse("(t 1 '1')")
bare, quoted := links[0].Values[1], links[0].Values[2]
fmt.Println(*bare.RawID, *quoted.RawID)      // 1 '1'
fmt.Printf("%q %q\n", bare.Quote(), quoted.Quote()) // "" "'"
fmt.Println(bare.Equal(quoted), links[0])    // true (t 1 1)
```

`RawID` равен `nil` у связи без ID, у связи, созданной в коде, у связи,
построенной объединением строк документа с отступами, и у любой связи,
прочитанной в режиме AST (`parser.Syntax = false`). `Quote()` возвращает
`"'"`, `"\""` или `` "`" `` для ID в кавычках и `""` в остальных случаях;
`ReferenceQuote(raw)` делает то же для любого текста ссылки. Потоковый парсер
сохраняет метаданные парсера, который он оборачивает.

## Конкретное синтаксическое дерево

`parser.ParseCst(input)` разбирает документ с параметрами парсера, поэтому
возвращает ошибку всякий раз, когда её возвращает `Parse` (а также при
несбалансированных скобках - `ErrUnbalancedParentheses`), и затем строит
дерево `*CstNode` без потерь: каждый байт входа, включая комментарии, пробелы
и переводы строк, принадлежит ровно одному токену, поэтому
`cst.String() == input`.

```go
cst, _ := lino.NewParser().ParseCst("(t 1 '1') # note")
fmt.Println(cst.String() == "(t 1 '1') # note") // true
fmt.Println(cst.SExpression())
// (document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")") whitespace:" " comment:"# note"))
```

Узлы: `document`, `line` (вместе с переводом строки) и `group` (`(`, строки
внутри и `)`); токены: `whitespace`, `newline`, `comment`, `open_paren`,
`close_paren`, `colon` и `reference`. У `CstNode` есть `Kind`, `Children`,
`Value` (значение токена ссылки, иначе `nil`), `Quote` (кавычка ссылки в
кавычках, иначе `""`), `Text()`, `String()`, `Tokens()` и `SExpression()`.
Подробности - в [разборе issue 364](../docs/case-studies/issue-364/README.md).

## Справочник API

### Типы

#### Link

```go
type Link struct {
    ID     *string
    Values []*Link
    RawID  *string // Как был записан разобранный ID; Equal и форматирование его не учитывают
}
```

Представляет связь в нотации связей. Связь может быть:
- ссылкой (только `ID`, без значений);
- связью с `ID` и значениями;
- связью только со значениями (без `ID`).

#### FormatConfig

```go
type FormatConfig struct {
    LessParentheses  bool   // Опускать скобки там, где это безопасно
    IndentString     string // Строка отступа (по умолчанию "  ")
    PreferInline     bool   // Предпочитать однострочный вид формату с отступами
    IndentByRefCount int    // Переходить на отступы при таком числе ссылок и больше
    IndentByLength   int    // Переходить на отступы, когда строка длиннее этого значения
    GroupConsecutive bool   // Группировать идущие подряд связи с одинаковым ID
}
```

### Функции

#### Parse

```go
func Parse(input string) ([]*Link, error)
```

Разбирает текст нотации связей в срез `*Link`.

#### NewParser

```go
func NewParser() *Parser
```

Создаёт парсер с ограничениями по умолчанию и с включёнными комментариями `#`.
Если выставить его полю `Comments` значение `false`, `#` читается как обычный
символ.

- `MaxInputSize` - наибольший принимаемый документ в байтах (по умолчанию 10 МБ)
- `MaxDepth` - допустимая глубина вложенности связей (по умолчанию
  `DefaultMaxDepth`, то есть 64); см. [Глубина вложенности](#глубина-вложенности)
- `Comments` - начинает ли `#` комментарий (по умолчанию `true`)
- `Syntax` - сохраняют ли разобранные связи `RawID`; `false` - режим AST
  (по умолчанию `true`)

#### Format

```go
func Format(links []*Link) string
```

Форматирует набор связей в многострочный текст.

#### FormatWithConfig

```go
func FormatWithConfig(links []*Link, config *FormatConfig) string
```

Форматирует связи по заданному `FormatConfig`.

### Методы Link

#### NewRef

```go
func NewRef(id string) *Link
```

Создаёт связь-ссылку (только `ID`, без значений).

#### NewLink

```go
func NewLink(id *string, values []*Link) *Link
```

Создаёт связь с необязательным `ID` и значениями.

#### Link.IsRef

```go
func (l *Link) IsRef() bool
```

Возвращает `true`, если связь является простой ссылкой (только `ID`).

#### Link.IsLink

```go
func (l *Link) IsLink() bool
```

Возвращает `true`, если у связи есть значения.

#### Link.Format

```go
func (l *Link) Format(lessParentheses bool) string
```

Форматирует связь в строку.

#### Link.Equal

```go
func (l *Link) Equal(other *Link) bool
```

Проверяет равенство с другой связью.

## Примеры

### Базовый разбор

```go
// Разбор простой связи
links, _ := lino.Parse("(папа имеет машину)")

// Разбор связи с идентификатором и значениями
links, _ := lino.Parse("(адрес: источник цель)")

// Разбор нескольких связей
links, _ := lino.Parse(`(папа имеет машину)
(мама имеет дом)`)
```

### Ссылки в кавычках

```go
// Ссылки с пробелами требуют кавычек
links, _ := lino.Parse(`("Нью-Йорк": город штат)`)

// Специальные символы
links, _ := lino.Parse(`('ключ:с:двоеточиями': 'значение')`)
```

### Синтаксис с отступами

```go
// Формат с отступами эквивалентен однострочному
indented := `id:
  значение1
  значение2`

inline := "(id: значение1 значение2)"

// Оба дают одинаковый результат
indentedLinks, _ := lino.Parse(indented)
inlineLinks, _ := lino.Parse(inline)
```

### Вложенные связи

```go
links, _ := lino.Parse("(внешняя: (внутренняя: значение))")

// Глубокая вложенность
links, _ := lino.Parse("(a: (b: (c: (d: значение))))")
```

### Настройка форматирования

```go
id := "id"
link := lino.NewLink(&id, []*lino.Link{
    lino.NewRef("значение1"),
    lino.NewRef("значение2"),
})

// Режим с меньшим числом скобок
output := link.Format(true) // "id: значение1 значение2"

// Через FormatConfig
config := lino.DefaultFormatConfig().
    WithLessParentheses(true).
    WithIndentByRefCount(3)
output = link.FormatWithConfig(config)
```

## Примеры синтаксиса

### Дуплеты (2-кортежи)

```lino
папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
```

### Триплеты (3-кортежи)

```lino
папа имеет машину
мама имеет дом
(папа и мама) счастливы
```

### N-кортежи со ссылками

```lino
I'm a friendly AI.
(I'm a friendly AI too.)
(linksNotation: links notation)
```

### Синтаксис с отступами

```lino
3:
  папа
  любит
  маму
```

Эквивалентно записи `(3: папа любит маму)`.

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

```go
document := `value (
  id "1"
  label "one"
)`

links, _ := lino.Parse(document)
fmt.Println(lino.Format(links)) // (value ((id 1) (label one)))
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

```go
document := "# машины, на которые идёт выкладка\ndeploy: staging # пока только staging\n"
links, _ := lino.Parse(document)
fmt.Println(lino.Format(links)) // (deploy: staging)

parser := lino.NewParser()
parser.Comments = false
plain, _ := parser.Parse("# a b\n")
fmt.Println(lino.Format(plain)) // (# a b)
```

### Глубина вложенности

Каждая группа в скобках и каждый уровень отступа - это один уровень
вложенности; строки документа находятся на уровне 0, а отступы внутри группы
отсчитываются поверх уровня самой группы. Парсер уходит в рекурсию на каждом
уровне, поэтому документ, вложенный глубже `MaxDepth` (по умолчанию
`DefaultMaxDepth`, то есть 64), он отклоняет с ошибкой, а не углубляется в
рекурсию, пока не исчерпает стек горутины и тем самым не завершит весь процесс.

Ошибка имеет тип `*ParseError`, и `errors.Is` сопоставляет её с
`ErrNestingTooDeep`. Она указывает на группу или строку, которая на один
уровень глубже допустимого:

- `MaxDepth` - наибольшая допустимая глубина, если документ вложен глубже;
  `0` для любой другой ошибки
- `Pos` - смещение ошибочной позиции от начала документа в байтах
- `Line`, `Column` - строка и столбец ошибочной позиции, считая с 1
- `LineText` - ошибочная строка в том виде, в каком она написана
- `Summary()` и `Snippet()` - первая строка сообщения и ошибочная строка
  с кареткой под ошибочным столбцом

```go
parser := lino.NewParser()
parser.MaxDepth = 3
_, err := parser.Parse("((((a))))")

var parseError *lino.ParseError
if errors.Is(err, lino.ErrNestingTooDeep) && errors.As(err, &parseError) {
    fmt.Println(parseError.Line, parseError.Column) // 1 4
    fmt.Println(err)
}
```

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

`StreamParser` использует ограничение парсера, с которым он создан, и
оборачивает ошибку в `*StreamParseError`, у которого `Line`, `Column` и
`Offset` отсчитываются от начала потока.

## Тестирование

```bash
cd go
go test -v
```

## Лицензия

[Unlicense](../LICENSE)
