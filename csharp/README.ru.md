# Парсер Links Notation для C&#35;

Реализация парсера Links Notation для C&#35; с использованием генератора
парсеров Pegasus и Platform.Collections.

## Установка

### Менеджер пакетов

```text
Install-Package Link.Foundation.Links.Notation
```

### .NET CLI

```bash
dotnet add package Link.Foundation.Links.Notation
```

### PackageReference

```xml
<PackageReference Include="Link.Foundation.Links.Notation" Version="0.9.0" />
```

## Сборка из исходного кода

Клонируйте репозиторий и соберите проект:

```bash
git clone https://github.com/link-foundation/links-notation.git
cd links-notation/csharp
dotnet build Link.Foundation.Links.Notation.sln
```

## Тестирование

Запуск тестов:

```bash
dotnet test
```

## Использование

### Базовый парсинг

```csharp
using Link.Foundation.Links.Notation;

// Создаем парсер
var parser = new Parser();

// Парсим строку в формате Links Notation
string input = @"папа (любитМаму: любит маму)
сын любитМаму
дочь любитМаму
все (любят маму)";

var links = parser.Parse(input);

// Обращение к распарсенным связям
foreach (var link in links)
{
    Console.WriteLine(link.ToString());
}
```

### Преобразование обратно в строку

```csharp
using Link.Foundation.Links.Notation;

// Форматирование связей обратно в строку
string formatted = links.Format();
Console.WriteLine(formatted);
```

### Работа со связями

```csharp
// Создание связи программно
var link = new Link<string>("идентификатор", new[] { "значение1", "значение2" });

// Доступ к свойствам связи
Console.WriteLine($"ID: {link.Id}");
foreach (var value in link.Values)
{
    Console.WriteLine($"Значение: {value}");
}
```

### Расширенное использование с универсальными типами

```csharp
// Использование числовых адресов связей
var parser = new Parser<ulong>();
var numericLinks = parser.Parse("(1: 2 3)");

// Работа с пользовательскими типами адресов
var customParser = new Parser<Guid>();
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

```csharp
var links = new Parser().Parse(@"value (
  id ""1""
  label ""one""
)");

Console.WriteLine(links[0]); // (value ((id 1) (label one)))
```

## Справочник API

### Классы

- **Parser\<TLinkAddress\>**: Основной класс парсера для преобразования строк в связи
- **Link\<TLinkAddress\>**: Представляет одну связь с ID и значениями
- **LinksGroup\<TLinkAddress\>**: Контейнер для группировки связанных связей
- **ParseException**: Выбрасывается, когда документ не разбирается

### Обработка ошибок

`Parse` выбрасывает `ParseException`, сообщение которого говорит, где документ
перестал быть понятным, и цитирует сломанную строку с указателем под ней:

```csharp
try
{
    new Parser().Parse("ci_gate x\nstage: rust: nextest\n");
}
catch (ParseException error)
{
    Console.Error.WriteLine(error.Message);
    Console.Error.WriteLine($"{error.Line}:{error.Column} (смещение {error.Offset})");
}
```

```text
Syntax error at line 2, column 12: unexpected ":"
2 | stage: rust: nextest
  |            ^
```

`ParseException` наследуется от `FormatException`, поэтому вызывающий код,
который уже ловит `FormatException`, продолжает работать, и несет `Offset`,
`Line`, `Column`, `Found`, `LineText`, `Summary` и `Snippet` для кода, который
сообщает об ошибках сам.

### Методы расширения

- **IListExtensions.Format()**: Преобразует список связей обратно в строковый формат
- **ILinksGroupListExtensions**: Дополнительные операции для групп связей

## Зависимости

- .NET 10.0
- Microsoft.CSharp (4.7.0)
- Pegasus (4.1.0)
- Platform.Collections (0.3.2)

## Документация

Полная документация API:
[Link.Foundation.Links.Notation Documentation](https://link-foundation.github.io/links-notation/csharp/api/Link.Foundation.Links.Notation.html)
