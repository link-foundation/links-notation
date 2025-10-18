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
