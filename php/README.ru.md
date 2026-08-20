# Парсер Links Notation для PHP

PHP-реализация парсера и форматтера нотации связей (lino).

## Установка

### Composer

```bash
composer require link-foundation/links-notation
```

Либо добавьте зависимость в ваш `composer.json`:

```json
{
    "require": {
        "link-foundation/links-notation": "^0.1"
    }
}
```

### Локальная разработка

Для разработчиков, работающих с исходным кодом:

```bash
cd php
composer install
```

## Тесты

Запуск тестов:

```bash
composer run-script test
```

## Линтер

Проверка стиля кода (PSR-12):

```bash
composer run-script lint
```

Автоматическое исправление:

```bash
composer run-script lint:fix
```

## Использование

### Базовый разбор

```php
<?php

require __DIR__ . '/vendor/autoload.php';

use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();

$input = <<<'LINO'
папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)
LINO;

foreach ($parser->parse($input) as $link) {
    echo $link, PHP_EOL;
}
```

### Работа со связями

```php
use LinkFoundation\LinksNotation\Link;

$parent = new Link('родитель', [new Link('ребёнок1'), new Link('ребёнок2')]);

echo $parent;                    // (родитель: ребёнок1 ребёнок2)
echo $parent->id;                // родитель
echo count($parent->values);     // 2
echo $parent->format(true);      // родитель: ребёнок1 ребёнок2
```

### Форматирование документа

```php
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();
$links = $parser->parse("папа любитМаму\nсын любитМаму");

echo Formatter::formatLinks($links);        // (папа любитМаму)\n(сын любитМаму)
echo Formatter::formatLinks($links, true);  // папа любитМаму\nсын любитМаму
```

### Настройки форматирования

```php
use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Link;

$link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

$config = new FormatConfig(maxInlineRefs: 3, preferInline: false);

echo $link->format($config);
// id:
//   1
//   2
//   3
//   4
```

### Вложенные структуры

```php
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();

$input = <<<'LINO'
родитель
  ребёнок1
  ребёнок2
    внук
LINO;

echo Formatter::formatLinks($parser->parse($input));
```

## Примеры синтаксиса

### Дуплеты (2-кортежи)

```lino
папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)
```

### Триплеты (3-кортежи)

```lino
папа имеет машину
мама имеет дом
(папа и мама) счастливы
```

### N-кортежи со ссылками

```lino
(нотацияСвязей: нотация связей)
(Это тоже нотацияСвязей)
(нотацияСвязей поддерживает (неограниченное количество (ссылок) в каждой связи))
```

### Отступы

```lino
родитель
  ребёнок1
  ребёнок2
    внук1
    внук2
```

### Синтаксис идентификатора с отступами

```lino
3:
  папа
  любит
  маму
```

Эквивалентно записи:

```lino
(3: папа любит маму)
```

### Строки с произвольным количеством кавычек

Любое количество одинаковых символов кавычек (`'`, `"` или `` ` ``) открывает
строку, и такое же количество её закрывает. Удвоение открывающей
последовательности внутри строки экранирует её.

```lino
("простая" 'простая' `простая`)
(""текст с " внутри"")
(```const x = 1;```)
```

## Справочник по API

### Классы

#### `LinkFoundation\LinksNotation\Parser`

Основной класс парсера, превращающий строки в связи.

- `__construct(int $maxInputSize = 10485760, int $maxDepth = 1000)` — создать парсер с ограничениями
- `parse(string $input): Link[]` — разобрать строку lino и вернуть связи
  - выбрасывает `InvalidArgumentException`, если вход больше `$maxInputSize`
  - выбрасывает `LinkFoundation\LinksNotation\ParseException`, если вход не удалось разобрать

#### `LinkFoundation\LinksNotation\Link`

Представляет одну связь с идентификатором и значениями.

- `__construct(?string $id = null, ?Link[] $values = null)` — создать связь
- `public ?string $id` — идентификатор связи
- `public Link[] $values` — дочерние значения/связи
- `__toString(): string` — строковое представление связи
- `format(bool|FormatConfig $lessParentheses = false, bool $isCompoundValue = false): string` — форматирование связи
- `equals(mixed $other): bool` — структурное сравнение с другой связью
- `simplify(): Link` — развернуть связь, содержащую единственное значение
- `combine(Link $other): Link` — объединить две связи в одну
- `getValuesString(): string` — отформатировать значения без обрамляющей связи
- `toLinkOrIdString(): string` — вернуть идентификатор, если связь является простой ссылкой
- `static escapeReference(?string $reference): string` — заключить ссылку в кавычки при необходимости

#### `LinkFoundation\LinksNotation\Formatter`

- `static formatLinks(Link[] $links, bool|FormatConfig $lessParentheses = false): string` — форматирование документа

#### `LinkFoundation\LinksNotation\FormatConfig`

Параметры форматирования.

- `lessParentheses` — опускать внешние скобки (по умолчанию `false`)
- `maxLineLength` — длина строки, после которой применяются отступы (по умолчанию `80`)
- `indentLongLines` — включить правило длины строки (по умолчанию `false`)
- `maxInlineRefs` — количество ссылок в строке, после которого применяются отступы (по умолчанию `null`)
- `groupConsecutive` — объединять подряд идущие связи с одинаковым идентификатором (по умолчанию `false`)
- `indentString` — строка одного уровня отступа (по умолчанию два пробела)
- `preferInline` — по возможности оставлять связи в одну строку (по умолчанию `true`)
- `shouldIndentByLength(string $line): bool`
- `shouldIndentByRefCount(int $refCount): bool`

#### `LinkFoundation\LinksNotation\ParseException`

Исключение, выбрасываемое при ошибке разбора.

## Структура проекта

- `src/Link.php` — структура данных связи
- `src/Formatter.php` — форматирование документа
- `src/FormatConfig.php` — параметры форматирования
- `src/Parser.php` — реализация парсера
- `src/ParseException.php` — исключение разбора
- `tests/` — набор тестов PHPUnit

## Требования

- PHP 8.1 или новее
- расширение `ext-mbstring`
- Composer 2

## Информация о пакете

- Пакет: `link-foundation/links-notation`
- Пространство имён: `LinkFoundation\LinksNotation`
- Версия: 0.1.0
- Лицензия: Unlicense
