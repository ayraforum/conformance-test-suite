PUT http://localhost:5000/systems/
Content-Type: application/json

{
  "name": "Example System",
  "description": "Example System Description",
  "version": "1.0.0",
  "endpoint": "https://example.com/api"
}

HTTP/1.1 201
[Asserts]
jsonpath "$.id" exists
jsonpath "$.name" equals "Example System"
jsonpath "$.description" equals "Example System Description"
jsonpath "$.version" equals "1.0.0"
jsonpath "$.endpoint" equals "https://example.com/api"

