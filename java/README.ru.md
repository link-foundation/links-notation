# Парсер Links Notation для Java

Java-реализация парсера Links Notation.

## Установка

### Maven

Добавьте зависимость в ваш `pom.xml`:

```xml
<dependency>
    <groupId>io.github.link-foundation</groupId>
    <artifactId>links-notation</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

Добавьте зависимость в ваш `build.gradle`:

```groovy
implementation 'io.github.link-foundation:links-notation:0.1.0'
```

### Локальная разработка

Для разработчиков, работающих с исходным кодом:

```bash
cd java
mvn install
```

## Сборка

Сборка проекта:

```bash
mvn clean compile
```

## Тестирование

Запуск тестов:

```bash
mvn test
```

## Использование

### Базовый парсинг

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;

import java.util.List;

public class Example {
    public static void main(String[] args) throws Exception {
        // Создание парсера
        Parser parser = new Parser();

        // Парсинг строки в формате Lino
        String input = """
            papa (lovesMama: loves mama)
            son lovesMama
            daughter lovesMama
            all (love mama)
            """;

        List<Link> result = parser.parse(input);

        // Доступ к структуре
        for (Link link : result) {
            System.out.println(link.toString());
        }
    }
}
```

### Работа со связями

```java
import io.github.linkfoundation.linksnotation.Link;

import java.util.Arrays;
import java.util.List;

// Создание связей программно
Link child1 = new Link("child1");
Link child2 = new Link("child2");
Link parent = new Link("parent", Arrays.asList(child1, child2));

System.out.println(parent.toString()); // (parent: child1 child2)

// Доступ к свойствам связи
System.out.println("ID: " + parent.getId());
System.out.println("Значения: " + parent.getValues());
```

### Продвинутое использование

```java
import io.github.linkfoundation.linksnotation.Parser;
import io.github.linkfoundation.linksnotation.Link;
import io.github.linkfoundation.linksnotation.LinksGroup;

// Работа с вложенными структурами
String input = """
    parent
      child1
      child2
        grandchild1
        grandchild2
    """;

Parser parser = new Parser();
List<Link> parsed = parser.parse(input);

// Работа с группами
LinksGroup group = new LinksGroup(parsed);
System.out.println(group.format());
```

## Примеры синтаксиса

### Дублеты (2-кортеж)

```lino
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)
```

### Триплеты (3-кортеж)

```lino
papa has car
mama has house
(papa and mama) are happy
```

### N-кортежи со ссылками

```lino
(linksNotation: links notation)
(This is a linksNotation as well)
(linksNotation supports (unlimited number (of references) in each link))
```

### Отступы

```lino
parent
  child1
  child2
    grandchild1
    grandchild2
```

### Синтаксис с ID и отступами

```lino
3:
  papa
  loves
  mama
```

Это эквивалентно:

```lino
(3: papa loves mama)
```

## Справочник API

### Классы

#### `Parser`

Основной класс парсера для преобразования строк в связи.

- `Parser()` - Создать парсер с настройками по умолчанию
- `Parser(int maxInputSize, int maxDepth)` - Создать парсер с пользовательскими лимитами
- `parse(String input)` - Распарсить строку Lino и вернуть связи

#### `Link`

Представляет отдельную связь с ID и значениями.

- `Link()` - Создать пустую связь
- `Link(String id)` - Создать связь с ID
- `Link(String id, List<Link> values)` - Создать связь с ID и значениями
- `getId()` - Получить идентификатор связи
- `getValues()` - Получить список дочерних значений/связей
- `toString()` - Преобразовать связь в строку
- `format(boolean lessParentheses)` - Форматировать с опциональным сокращением скобок
- `equals(Object other)` - Проверить равенство с другой связью
- `static formatLinks(List<Link> links)` - Форматировать список связей

#### `LinksGroup`

Контейнер для группировки связанных связей.

- `LinksGroup()` - Создать пустую группу
- `LinksGroup(List<Link> links)` - Создать группу со связями
- `add(Link link)` - Добавить связь в группу
- `getLinks()` - Получить список связей
- `size()` - Получить количество связей
- `isEmpty()` - Проверить, пуста ли группа
- `format()` - Форматировать группу как строку

#### `ParseException`

Исключение, выбрасываемое при ошибке парсинга.

## Структура проекта

- `src/main/java/io/github/linkfoundation/linksnotation/Link.java` - Структура данных Link
- `src/main/java/io/github/linkfoundation/linksnotation/LinksGroup.java` - Контейнер группы связей
- `src/main/java/io/github/linkfoundation/linksnotation/Parser.java` - Реализация парсера
- `src/main/java/io/github/linkfoundation/linksnotation/ParseException.java` - Исключение парсинга
- `src/test/java/` - Тестовые файлы

## Поддержка

### Форматирование кода

Проект использует Google Java Format через Spotless:

```bash
mvn spotless:apply
```

Проверка форматирования:

```bash
mvn spotless:check
```

## Требования

- Java 11 или выше
- Maven 3.6+

## Информация о пакете

- Group ID: `io.github.link-foundation`
- Artifact ID: `links-notation`
- Версия: 0.1.0
- Лицензия: Unlicense
