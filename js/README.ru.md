# Парсер протокола Lino для JavaScript

Реализация парсера протокола Lino для JavaScript с использованием Bun и генератора парсеров Peggy.js.

## Установка

### Использование Bun (рекомендуется)

```bash
cd js
bun install
```

### Использование npm

```bash
cd js
npm install
```

## Сборка

Компиляция грамматики Peggy.js:

```bash
bun run build:grammar
```

Сборка проекта:

```bash
bun run build
```

## Тестирование

Запуск тестов:

```bash
bun test
```

Режим наблюдения:

```bash
bun test --watch
```

## Использование

### Базовый парсинг

```javascript
import { Parser, Link } from '@linksplatform/protocols-lino';

// Создание парсера
const parser = new Parser();

// Парсинг строки в формате Lino
const input = `папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)`;

const result = parser.parse(input);
console.log(result);

// Обращение к распарсенной структуре
result.forEach(link => {
    console.log(link.toString());
});
```

### Работа со связями

```javascript
import { Link } from '@linksplatform/protocols-lino';

// Создание связей программно
const link = new Link('родитель', [
    new Link('ребенок1'),
    new Link('ребенок2')
]);

console.log(link.toString()); // (родитель: ребенок1 ребенок2)

// Доступ к свойствам связи
console.log('ID:', link.id);
console.log('Значения:', link.values);
```

### Расширенное использование

```javascript
// Обработка вложенных структур
const input = `родитель
  ребенок1
  ребенок2
    внук1
    внук2`;

const parsed = await parser.parse(input);

// Работа с группами
import { LinksGroup } from '@linksplatform/protocols-lino';
const group = new LinksGroup(parsed);
console.log(group.format());
```

## Примеры синтаксиса

### Дублеты (2-кортежи)
```
папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)
```

### Триплеты (3-кортежи)
```
папа имеет машину
мама имеет дом
(папа и мама) счастливы
```

### N-кортежи со ссылками
```
(нотацияСвязей: нотация связей)
(Это тоже нотацияСвязей)
(нотацияСвязей поддерживает (неограниченное количество (ссылок) в каждой связи))
```

### Структура с отступами
```
родитель
  ребенок1
  ребенок2
    внук1
    внук2
```

## Справочник API

### Классы

#### `Parser`
Основной класс парсера для преобразования строк в связи.
- `initialize()` - Инициализация парсера (асинхронно)
- `parse(input)` - Парсинг строки Lino и возвращение связей

#### `Link`
Представляет одну связь с ID и значениями.
- `constructor(id, values = [])` - Создание новой связи
- `toString()` - Преобразование связи в строковый формат
- `id` - Идентификатор связи
- `values` - Массив дочерних значений/связей

#### `LinksGroup`
Контейнер для группировки связанных связей.
- `constructor(links)` - Создание новой группы
- `format()` - Форматирование группы в строку

## Структура проекта

- `src/grammar.pegjs` - Определение грамматики Peggy.js
- `src/Link.js` - Структура данных связи
- `src/LinksGroup.js` - Контейнер групп связей  
- `src/Parser.js` - Обертка парсера
- `src/index.js` - Главная точка входа
- `tests/` - Файлы тестов

## Зависимости

- Peggy.js (5.0.6) - Генератор парсеров
- Среда выполнения Bun (разработка)

## Информация о пакете

- Пакет: `@linksplatform/protocols-lino`
- Версия: 0.1.0
- Лицензия: MIT