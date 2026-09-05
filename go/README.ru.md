# Парсер Links Notation для Go

[![Actions Status](https://github.com/link-foundation/links-notation/workflows/go/badge.svg)](https://github.com/link-foundation/links-notation/actions?workflow=go)
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

## Справочник API

### Типы

#### Link

```go
type Link struct {
    ID     *string
    Values []*Link
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

## Тестирование

```bash
cd go
go test -v
```

## Лицензия

[Unlicense](../LICENSE)
