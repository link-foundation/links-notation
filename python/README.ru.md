# Парсер Links Notation для Python

[![Версия PyPI](https://img.shields.io/pypi/v/links-notation.svg)](https://pypi.org/project/links-notation/)
[![Версии Python](https://img.shields.io/pypi/pyversions/links-notation.svg)](https://pypi.org/project/links-notation/)
[![Лицензия](https://img.shields.io/badge/license-Unlicense-blue.svg)](../LICENSE)

Реализация парсера Links Notation для Python.

## Установка

```bash
pip install links-notation
```

## Быстрый старт

```python
from links_notation import Parser

parser = Parser()
links = parser.parse("папа (любитМаму: любит маму)")

# Обращение к распарсенным связям
for link in links:
    print(link)
```

## Использование

### Базовый парсинг

```python
from links_notation import Parser, format_links

parser = Parser()

# Парсинг простых связей
links = parser.parse("(папа: любит маму)")
print(links[0].id)  # 'папа'
print(len(links[0].values))  # 2

# Форматирование связей обратно в строку
output = format_links(links)
print(output)  # (папа: любит маму)
```

### Работа с объектами связей

```python
from links_notation import Link

# Создание связей программно
link = Link('родитель', [Link('ребенок1'), Link('ребенок2')])
print(str(link))  # (родитель: ребенок1 ребенок2)

# Доступ к свойствам связи
print(link.id)  # 'родитель'
print(link.values[0].id)  # 'ребенок1'

# Объединение связей
combined = link.combine(Link('другая'))
print(str(combined))  # ((родитель: ребенок1 ребенок2) другая)
```

### Синтаксис с отступами

```python
parser = Parser()

# Парсинг нотации с отступами
text = """3:
  папа
  любит
  маму"""

links = parser.parse(text)
# Результат: (3: папа любит маму)
```

## Справочник API

### Parser

Основной класс парсера для Links Notation.

- `__init__(..., comments: bool = True)`: создать парсер; при `comments=False`
  `#` — обычный символ, а не начало комментария
- `parse(input_text: str) -> List[Link]`: Парсинг текста Links Notation в объекты Link

### Link

Представляет связь в Links Notation.

- `__init__(id: Optional[str] = None, values: Optional[List[Link]] = None)`
- `format(less_parentheses: bool = False) -> str`: Форматирование в строку
- `simplify() -> Link`: Упрощение структуры связи
- `combine(other: Link) -> Link`: Объединение с другой связью

### format_links

Форматирование списка связей в Links Notation.

- `format_links(links: List[Link], less_parentheses: bool = False) -> str`

## Примеры

### Дуплеты (2-кортежи)

```python
parser = Parser()
text = """
папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
"""
links = parser.parse(text)
```

### Триплеты (3-кортежи)

```python
text = """
папа имеет машину
мама имеет дом
(папа и мама) счастливы
"""
links = parser.parse(text)
```

### Ссылки в кавычках

```python
# Ссылки со специальными символами требуют кавычек
text = '("есть пробел": "значение с: двоеточием")'
links = parser.parse(text)
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

```python
text = """value (
  id "1"
  label "one"
)"""
print(format_links(parser.parse(text)))
# (value ((id 1) (label one)))
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

```python
document = "# машины, на которые идёт выкладка\ndeploy: staging # пока только staging\n"
print(format_links(Parser().parse(document)))  # (deploy: staging)

print(format_links(Parser(comments=False).parse("# a b\n")))  # (# a b)
```

## Разработка

### Запуск тестов

```bash
# Установка зависимостей для разработки
pip install pytest

# Запуск тестов
pytest
```

### Сборка

```bash
pip install build
python -m build
```

## Лицензия

Этот проект выпущен в общественное достояние под лицензией [Unlicense](../LICENSE).

## Ссылки

- [Главный репозиторий](https://github.com/link-foundation/links-notation)
- [Пакет PyPI](https://pypi.org/project/links-notation/)
- [Документация](https://link-foundation.github.io/links-notation/)
