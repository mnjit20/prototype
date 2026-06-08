//Todo: 
// Implement sharding logic with actual mysql/postgres sql.
// The system should allow for inserting new users, retrieving user data, and listing all users in a shard.
const [data, data2, data3] = [new Map(), new Map(), new Map()];

const shard1 = {
    insert(user) { 
        data.set(user.id, user);
    },

    get(id) {
        return data.get(id);
    },

    all() {
        return [...data.values()];
    }
};

const shard2 = {
    insert(user) {
        data2.set(user.id, user);
    },

    get(id) {
        return data2.g et(id);
    },

    all() {
        return [...data2.values()];
    }
};

const shard3 = {
    insert(user) {
        data3.set(user.id, user);
    },

    get(id) {
        return data3.get(id);
    },

    all() {
        return [...data3.values()];
    }
};

const shards = [shard1, shard2, shard3];

function getShard(userId) {
    const shardIndex = userId % shards.length;
    return shards[shardIndex];
}

function init(user) {
    const shard = getShard(user.id);
    shard.insert(user);
    const userData = shard.get(user.id);

    const result = {
        message: "Stored successfully",
        shard: user.id % shards.length
    };

    console.log(result);
    // console.log("Read User data:", userData);

}

function main() {
    console.log("Starting sharding module");

    init({ id: 1, name: "Alice" });
    init({ id: 2, name: "Alice2" });
    init({ id: 3, name: "Alice3" });
    init({ id: 4, name: "Alice4" });
    init({ id: 5, name: "Alice5" });
    init({ id: 6, name: "Alice6" });
    init({ id: 7, name: "Alice7" });
}

main();