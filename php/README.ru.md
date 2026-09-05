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
        "link-foundation/links-notation": "^0.18"
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

```php
$input = <<<'LINO'
value (
  id "1"
  label "one"
)
LINO;

echo Formatter::formatLinks($parser->parse($input)); // (value ((id 1) (label one)))
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

```php
$document = "# машины, на которые идёт выкладка\ndeploy: staging # пока только staging\n";
echo Formatter::formatLinks((new Parser())->parse($document)); // (deploy: staging)

$plain = new Parser(10 * 1024 * 1024, 1000, false);
echo Formatter::formatLinks($plain->parse("# a b\n")); // (# a b)
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

- `__construct(int $maxInputSize = 10485760, int $maxDepth = 1000, bool $comments = true)` — создать
  парсер с ограничениями и с комментариями `#`, если `$comments` не `false`
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

- PHP 8.4 или новее
- расширение `ext-mbstring`
- Composer 2

## Информация о пакете

- Пакет: `link-foundation/links-notation`
- Пространство имён: `LinkFoundation\LinksNotation`
- Лицензия: Unlicense (см. [LICENSE](../LICENSE))
