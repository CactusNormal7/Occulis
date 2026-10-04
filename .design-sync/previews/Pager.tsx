import { Pager } from "@occulis/ui";

const hrefFor = (offset: number) => `#/users?offset=${offset}`;

export const Middle = () => (
  <div style={{ padding: 8 }}>
    <Pager offset={25} shown={25} total={132} pageSize={25} hrefFor={hrefFor} />
  </div>
);

export const FirstPage = () => (
  <div style={{ padding: 8 }}>
    <Pager offset={0} shown={25} total={132} pageSize={25} hrefFor={hrefFor} />
  </div>
);
