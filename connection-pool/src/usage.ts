import { query } from './query';

async function main() {
    const users = await query(
        'SELECT * FROM users WHERE id = $1',
        [1]
    );

    console.log(users);
}

main();