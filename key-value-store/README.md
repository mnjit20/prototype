Add key value database implementation using mysql/postgresql database 

// This should 
CREATE TABLE kv_store
(
    key PRIMARY KEY,
    value text,
    created_at TIMESTAMP,
    updated_at TIMESTAMP default current(),
    is_deleted boolean,
    
);