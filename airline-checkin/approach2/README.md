# This method is running multiple threads simultaneously without the need for locking


### SQL
`SELECT *
            FROM seats
            WHERE booked != true
            limit 1
            FOR UPDATE SKIP LOCKED`
