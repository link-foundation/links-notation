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

Парсер возвращает описательные сообщения об ошибках для:

- Пустого ввода или ввода только из пробелов
- Неправильного синтаксиса
- Незакрытых скобок
- Недопустимых символов

```rust
match parse_lino("(недопустимо") {
    Ok(parsed) => println!("Распарсено: {}", parsed),
    Err(error) => eprintln!("Ошибка: {}", error),
}
```
