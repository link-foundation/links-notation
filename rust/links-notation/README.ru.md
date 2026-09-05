# Парсер Links Notation для Rust

Реализация парсера Links Notation для Rust с использованием библиотеки
комбинаторов парсеров nom.

## Установка

Добавьте это в ваш `Cargo.toml`:

```toml
[dependencies]
links-notation = { path = "." }  # Для локальной разработки
# Или из реестра:
# links-notation = "0.9.0"
```

### Из исходного кода

Клонируйте репозиторий и соберите:

```bash
git clone https://github.com/link-foundation/links-notation.git
cd links-notation/rust
cargo build
```

## Сборка

Сборка проекта:

```bash
cargo build
```

Сборка с оптимизациями:

```bash
cargo build --release
```

## Тестирование

Запуск тестов:

```bash
cargo test
```

Запуск тестов с выводом:

```bash
cargo test -- --nocapture
```

## Использование

### Базовый парсинг

```rust
use links_notation::{parse_lino, LiNo};

fn main() {
    // Парсинг строки в формате Links Notation
    let input = r#"папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)"#;
    
    match parse_lino(input) {
        Ok(parsed) => {
            println!("Распарсено: {}", parsed);
            
            // Обращение к структуре
            if let LiNo::Link { values, .. } = parsed {
                for link in values {
                    println!("Связь: {}", link);
                }
            }
        }
        Err(e) => eprintln!("Ошибка парсинга: {}", e),
    }
}
```

### Работа со связями

```rust
use links_notation::LiNo;

// Создание связей программно
let reference = LiNo::Ref("некоторое_значение".to_string());
let link = LiNo::Link {
    id: Some("родитель".to_string()),
    values: vec![
        LiNo::Ref("ребенок1".to_string()),
        LiNo::Ref("ребенок2".to_string()),
    ],
};

// Проверка типов связей
if link.is_link() {
    println!("Это связь");
}
if reference.is_ref() {
    println!("Это ссылка");
}
```

### Форматирование вывода

```rust
use links_notation::parse_lino;

let input = "(родитель: ребенок1 ребенок2)";
let parsed = parse_lino(input).unwrap();

// Обычное форматирование (в скобках)
println!("Обычное: {}", parsed);

// Альтернативное форматирование (построчно)
println!("Альтернативное: {:#}", parsed);
```

### Обработка различных форматов ввода

```rust
use links_notation::parse_lino;

// Формат одной строки
let single_line = "идентификатор: значение1 значение2";
let parsed = parse_lino(single_line)?;

// Формат в скобках
let parenthesized = "(идентификатор: значение1 значение2)";
let parsed = parse_lino(parenthesized)?;

// Многострочный с отступами
let indented = r#"родитель
  ребенок1
  ребенок2"#;
let parsed = parse_lino(indented)?;

// Кавычки в идентификаторах и значениях
let quoted = r#"("идентификатор с пробелами": "значение с пробелами")"#;
let parsed = parse_lino(quoted)?;
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

### Структура с отступами

```lino
родитель
  ребенок1
  ребенок2
    внук1
    внук2
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

```rust
use links_notation::{format_links, parse_lino_to_links};

let input = r#"value (
  id "1"
  label "one"
)"#;

let links = parse_lino_to_links(input)?;
println!("{}", format_links(&links)); // (value ((id 1) (label one)))
```

## Справочник API

### Перечисления

#### `LiNo<T>`

Представляет либо связь, либо ссылку:

- `Link { id: Option<T>, values: Vec<Self> }` - Связь с опциональным ID и
  дочерними значениями
- `Ref(T)` - Ссылка на другую связь

### Методы

#### Методы для `LiNo<T>`

- `is_ref() -> bool` - Возвращает true, если это ссылка
- `is_link() -> bool` - Возвращает true, если это связь

### Функции

#### `parse_lino(document: &str) -> Result<LiNo<String>, String>`

Парсит строку документа Links Notation и возвращает распарсенную структуру или ошибку.

### Форматирование

Трейт `Display` реализован для `LiNo<T>` где `T: ToString`:

- Обычный формат: `format!("{}", lino)` - Вывод в скобках
- Альтернативный формат: `format!("{:#}", lino)` - Построчный вывод

## Зависимости

- nom (8.0) - Библиотека комбинаторов парсеров

## Обработка ошибок

Ошибка разбора сообщает, где документ перестал быть понятным. При выводе она
показывает строку и столбец, что могло стоять на этом месте, и саму строку с
указателем под ней:

```rust
match parse_lino("# ok line\n# break: two\nci_gate x\n") {
    Ok(parsed) => println!("Распарсено: {}", parsed),
    Err(error) => eprintln!("{}", error),
}
```

```text
Syntax error at line 2, column 8: expected "(", a reference or end of line, found ":"
2 | # break: two
  |        ^
```

Та же позиция доступна в виде полей — для вызывающего кода, который сообщает об
ошибках сам, а не печатает их:

```rust
use links_notation::{parse_lino, ParseError};

if let Err(ParseError::SyntaxError(error)) = parse_lino("a: b: c") {
    println!("{}:{} (байтовое смещение {})", error.line, error.column, error.offset);
    println!("ожидалось {:?}, найдено {:?}", error.expected, error.found);
}
```

`ParseError::EmptyInput` возвращается для пустого ввода или ввода только из
пробелов. `cargo run --example parse_error_positions` печатает то, что сообщают
несколько сломанных документов.
