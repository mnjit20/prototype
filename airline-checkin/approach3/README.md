# This method is running sequently without Promise.all and using locking to show the time its taking which is around 25sec


### SQL
`SELECT *
            FROM seats
            WHERE booked != true
            limit 1
            FOR UPDATE`
