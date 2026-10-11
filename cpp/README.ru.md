# Парсер Links Notation для C++

[![Actions Status](https://github.com/link-foundation/links-notation/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/links-notation/actions/workflows/js.yml)
[![GitHub release](https://img.shields.io/github/v/release/link-foundation/links-notation?filter=cpp_*&label=release)](https://github.com/link-foundation/links-notation/releases?q=cpp_&expanded=true)

Реализация парсера и форматтера нотации связей (Links Notation, lino) от Link
Foundation на C++17. Она не зависит ни от чего, кроме стандартной библиотеки, и
собирается CMake 3.16 и новее в GCC, Clang, Apple Clang и MSVC.

## Установка

Каждый выпуск публикует папку `cpp/` как архив исходников в GitHub-выпуске
`cpp_VERSION` вместе с его контрольной суммой SHA-256.

### FetchContent

```cmake
include(FetchContent)
FetchContent_Declare(
  links_notation
  URL https://github.com/link-foundation/links-notation/releases/download/cpp_0.26.0/links-notation-cpp-0.26.0.tar.gz
  # Необязательно: контрольная сумма из links-notation-cpp-0.26.0.tar.gz.sha256
  # URL_HASH SHA256=...
)
FetchContent_MakeAvailable(links_notation)

target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

Когда библиотека добавлена в другой проект, тесты и примеры не собираются.

### find_package

Соберите и установите библиотеку один раз:

```bash
cmake -S cpp -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
cmake --install build --prefix /usr/local
```

Затем подключите её в своём проекте:

```cmake
find_package(links_notation 0.26 REQUIRED CONFIG)
target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

### add_subdirectory

Подойдёт и копия `cpp/` в дереве исходников:

```cmake
add_subdirectory(third_party/links-notation-cpp)
target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

## Быстрый старт

```cpp
#include <iostream>

#include "links_notation.hpp"

int main() {
  // Разбор нотации связей
  const std::vector<links_notation::Link> links = links_notation::parse("папа (любитМаму: любит маму)");

  // Обратное форматирование в строку
  std::cout << links_notation::format_links(links) << '\n';
}
```

`links_notation.hpp` подключает всю библиотеку; всё находится в пространстве
имён `links_notation`. `links_notation/version.hpp` определяет
`LINKS_NOTATION_VERSION_STRING` и `links_notation::version`.

## Возможности

- Разбор нотации связей (lino) в объекты `Link`
- Форматирование `Link` обратно в нотацию связей
- Поддержка однострочного синтаксиса и синтаксиса с отступами
- Комментарии `#`, включённые по умолчанию и отключаемые
- Строки в кавычках со специальными символами
- Строки в тройных кавычках для вложенных кавычек
- Настраиваемое форматирование через `FormatConfig`
- Потоковый разбор через `StreamParser` и ленивое чтение через `parse_chunks`
- Документы с отступами через `parse_indented_document`
- Бинарная нотация связей через `BinaryLinoCodec`
- Полная совместимость с остальными семью реализациями (JavaScript, Rust,
  Python, Java, Go, C#, PHP)

Каждый фрагмент ниже проверяет [`examples/features.cpp`](examples/features.cpp),
который запускается как тест.

## Потоковый разбор

`StreamParser` принимает произвольные порции, которые могут обрываться посреди
строки, ссылки или последовательности UTF-8, и выдаёт завершённые записи
верхнего уровня через связи, возвращаемые каждым `write`, или через `on_link`.
Вызовите `set_collect(false)`, чтобы callback хранил только незавершённую
запись.

```cpp
links_notation::StreamParser stream;
stream.on_link([](const links_notation::Link& link) { std::cout << link << '\n'; });
for (const char* chunk : {"papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"}) stream.write(chunk);
stream.finish();
// (papa (lovesMama: loves mama))
// (son lovesMama)
```

Для долгоживущих потоков доступны `on_error`, `position`, `drain`, `reset` и
`set_max_buffer_size`. `parse_chunks` лениво читает связи из любой
последовательности порций, а `ChunkedLinks` - из функции, которая возвращает
следующую порцию:

```cpp
links_notation::ChunkedLinks links = links_notation::parse_chunks(std::vector<std::string>{"a b\nc", " d\n"});
while (std::optional<links_notation::Link> link = links.next()) std::cout << *link << '\n';
// (a b)
// (c d)
```

## Справочник API

### Link

```cpp
class Link {
 public:
  std::optional<std::string> id;
  std::vector<Link> values;

  bool is_reference() const;
  std::string format(bool less_parentheses = false, bool compound = false) const;
  std::string format(const FormatConfig& config, bool compound = false) const;
  bool equals(const Link& other) const;
  Link simplify() const;
  Link combine(const Link& other) const;
};
```

Представляет связь в нотации связей. Связь может быть:

- ссылкой (только ID, без значений)
- связью с ID и значениями
- связью только со значениями (без ID)

`Link("папа")` - это ссылка, а `Link(id, values)` - связь с необязательным ID.
Связи сравниваются через `==`, а `operator<<` выводит `format()`.

### Функции

```cpp
std::vector<Link> parse(std::string_view document);
std::string format_links(const std::vector<Link>& links, bool less_parentheses = false);
std::string format_links(const std::vector<Link>& links, const FormatConfig& config);
```

`parse` читает документ с настройками по умолчанию и выбрасывает `ParseError`,
если документ не разбирается.

### Parser

```cpp
links_notation::ParserOptions options;
options.max_depth = 16;
const links_notation::Parser parser(options);
std::vector<links_notation::Link> links = parser.parse(document);
std::vector<links_notation::LinksGroup> groups = parser.parse_groups(document);
```

`ParserOptions` содержит:

- `max_input_size` - наибольший принимаемый документ в байтах (по умолчанию
  10 МБ); для большего выбрасывается `std::length_error`
- `max_depth` - допустимая глубина вложенности связей (по умолчанию
  `default_max_depth`, то есть 64); см. [Глубина вложенности](#глубина-вложенности)
- `comments` - начинает ли `#` комментарий (по умолчанию `true`)

`parse_groups` хранит связь каждой строки вместе со строками, вложенными под
неё отступом, в виде `LinksGroup{element, children}`.

### FormatConfig

```cpp
const links_notation::FormatConfig config = links_notation::FormatConfig::builder()
                                                .indent_long_lines(true)
                                                .max_line_length(20)
                                                .prefer_inline(false)
                                                .build();
std::cout << links_notation::format_links(links_notation::parse("(record: first second third fourth)"), config);
// record:
//   first
//   second
//   third
//   fourth
```

Настройки: `less_parentheses`, `max_line_length` (по умолчанию 80),
`indent_long_lines`, `max_inline_refs`, `group_consecutive`, `indent_string`
(по умолчанию два пробела) и `prefer_inline` (по умолчанию `true`).

### Документы с отступами

`parse_indented_document` читает текстовых родителей и их непосредственных
текстовых потомков, а `format_indented_document` записывает их обратно с
минимальным экранированием:

```cpp
const std::vector<links_notation::IndentedEntry> entries =
    links_notation::parse_indented_document("colors\n  red\n  'light blue'\nempty\n");
// entries: {"colors", {"red", "light blue"}}, {"empty", {}}
std::cout << links_notation::format_indented_document(entries);
```

`MultipleValues::join` объединяет нескольких потомков в одно значение, по
одному потомку на строку.

### Бинарная нотация связей

`BinaryLinoCodec` записывает документы в
[бинарной нотации связей](../docs/protocol/binary-links-notation.md) и в
точности читает их обратно, байт в байт так же, как остальные реализации:

```cpp
const links_notation::BinaryLinoCodec codec;
const std::vector<std::uint8_t> bytes = codec.encode_text("papa (lovesMama: loves mama)");
std::cout << codec.decode_text(bytes) << '\n';

// Возможности версии 2: внешние ссылки, диапазон арностей, упакованные ширины.
const links_notation::BinaryLinoCodec v2(
    links_notation::BinaryLinoOptions{true, links_notation::ArityRange::parse("2..3"), true});
```

`encode` и `decode` работают с `std::vector<Link>`, а `encode_packet` и
`decode_packet` - с самой структурой пакета. Некорректные данные приводят к
`BinaryError`, а `DecodeLimits` ограничивает то, что принимает декодер.

## Примеры

### Базовый разбор

```cpp
// Разбор простой связи
auto links = links_notation::parse("(папа имеет машину)");

// Разбор с ID и значениями
links = links_notation::parse("(адрес: источник цель)");

// Разбор нескольких связей
links = links_notation::parse("(папа имеет машину)\n(мама имеет дом)");
```

### Ссылки в кавычках

```cpp
// Ссылки с пробелами требуют кавычек
auto links = links_notation::parse(R"(("Нью-Йорк": город штат))");

// Специальные символы
links = links_notation::parse("('ключ:с:двоеточиями': 'значение')");
```

### Синтаксис с отступами

```cpp
// Формат с отступами эквивалентен однострочному
const auto indented = links_notation::parse("id:\n  value1\n  value2");
const auto inline_links = links_notation::parse("(id: value1 value2)");

// Оба дают одинаковый результат
assert(indented == inline_links);
```

### Настройка форматирования

```cpp
const links_notation::Link link("id", {links_notation::Link("value1"), links_notation::Link("value2")});

// Режим с меньшим количеством скобок
std::cout << link.format(true) << '\n';  // id: value1 value2
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

```cpp
const auto links = links_notation::parse("value (\n  id \"1\"\n  label \"one\"\n)");
std::cout << links_notation::format_links(links) << '\n';  // (value ((id 1) (label one)))
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

```cpp
const auto links = links_notation::parse("# машины, на которые идёт выкладка\ndeploy: staging # пока только staging\n");
std::cout << links_notation::format_links(links) << '\n';  // (deploy: staging)

links_notation::ParserOptions options;
options.comments = false;
const auto plain = links_notation::Parser(options).parse("# a b\n");
std::cout << links_notation::format_links(plain) << '\n';  // ('#' a b)
```

### Глубина вложенности

Каждая группа в скобках и каждый уровень отступа - это один уровень
вложенности; строки документа находятся на уровне 0, а отступы внутри группы
отсчитываются поверх уровня самой группы. Парсер уходит в рекурсию на каждом
уровне, поэтому документ, вложенный глубже `max_depth` (по умолчанию
`default_max_depth`, то есть 64), он отклоняет с ошибкой, а не углубляется в
рекурсию, пока не исчерпает стек и тем самым не завершит весь процесс.

Ошибка имеет тип `ParseError`, а её `kind()` равен `ParseError::Kind::nesting`.
Она указывает на группу или строку, которая на один уровень глубже
допустимого:

- `max_depth()` - наибольшая допустимая глубина для ошибки вложенности
- `offset()` - смещение ошибочной позиции от начала документа в байтах
- `line()`, `column()` - строка и столбец ошибочной позиции, считая с 1
- `line_text()` - ошибочная строка в том виде, в каком она написана
- `summary()` и `snippet()` - первая строка сообщения и ошибочная строка
  с кареткой под ошибочным столбцом

```cpp
links_notation::ParserOptions options;
options.max_depth = 3;
try {
  links_notation::Parser(options).parse("((((a))))");
} catch (const links_notation::ParseError& error) {
  std::cout << error.line() << ' ' << error.column() << '\n';  // 1 4
  std::cout << error.what() << '\n';
}
```

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

`StreamParser` использует настройки, с которыми он создан, и оборачивает ошибку
в `StreamParseError`, у которого `location()` отсчитывается от начала потока.

## Тестирование

```bash
cd cpp
cmake -S . -B build -DLINKS_NOTATION_WARNINGS_AS_ERRORS=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```

Тесты используют GoogleTest, который CMake скачивает, если не установлен
GoogleTest 1.11 или новее, и читают общие фикстуры из папок `parity/` и `docs/`
репозитория, поэтому собираются из полной копии репозитория.
`LINKS_NOTATION_BUILD_TESTS` и `LINKS_NOTATION_BUILD_EXAMPLES` включают и
выключают их.

Исходники форматируются версией clang-format, закреплённой в
[`tools/requirements.txt`](tools/requirements.txt).

## Лицензия

[Unlicense](../LICENSE)

Точные Unicode-идентификаторы и значения проходят полный цикл по
[контракту ссылочных литералов](../docs/protocol/reference-literals.md), включая
смешанные кавычки, пустые строки, управляющие символы и многострочный текст.
