import sys
sys.path.insert(0, 'python')

from links_notation import Parser

parser = Parser()

# Test 6 quotes
simple6 = '""""""hello""""""'
print(f'Simple 6 quotes input: {simple6}')
result = parser.parse(simple6)
print(f'Simple 6 quotes result: {result}')
for link in result:
    print(f'  Link id: {link.id}, values: {link.values}')

# Test 6 quotes with content
six_quotes = '""""""hello with """"" five quotes inside""""""'
print(f'\n6 quotes input: {six_quotes}')
result = parser.parse(six_quotes)
print(f'6 quotes result: {result}')
for link in result:
    print(f'  Link id: {link.id}, values: {link.values}')

# Test 10 quotes
ten_quotes = '""""""""""very deeply quoted""""""""""'
print(f'\n10 quotes input: {ten_quotes}')
result = parser.parse(ten_quotes)
print(f'10 quotes result: {result}')
for link in result:
    print(f'  Link id: {link.id}, values: {link.values}')
