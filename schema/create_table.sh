create_table_json="file://$PWD/user_notes.table.json"
aws dynamodb create-table --cli-input-json $create_table_json --endpoint-url http://localhost:8000