const users = {
  get: (id: string) => {
    return {
      id,
      name: `user${id}`,
    };
  },
};

const chatTable = {
  getByIds: (ids: string[]) => {
    return ids.map((id) => {
      return {
        id,
        name: `chat${id}`,
      };
    });
  },
};

const allStore = {
  users,
  chatTable,
};

type StoreType = typeof allStore;

const api: StoreType = new Proxy({} as any, {
  get(_, store) {
    return new Proxy(
      {},
      {
        get(_, key) {
          return (...args: any[]) => {
            return allStore[store][key](...args);
          };
        },
      },
    );
  },
});

console.log('get1', api.users.get('1'));

api.users.get('1');
