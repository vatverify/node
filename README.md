# @vatverify/node

Official Node.js client for the [vatverify](https://vatverify.dev) API.

```bash
npm install @vatverify/node
```

```ts
import { Vatverify } from '@vatverify/node';

const client = new Vatverify('vtv_live_...');
const { data, meta } = await client.validate({ vat_number: 'IE6388047V' });
console.log(data.valid, data.company?.name, meta.request_id);
```

Full documentation in progress. Source + issues: https://github.com/vatverify/node.

## License

MIT
