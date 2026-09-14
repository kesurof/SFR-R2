"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Empty, Pagination, Space } from "antd";

/**
 * Liste de cartes empilées pour la présentation mobile, avec pagination optionnelle.
 * Évite `List`, déprécié par Ant Design 6.6, tout en gardant un rendu homogène entre
 * les différentes tables converties en cartes.
 */
export function MobileCardList<T>({
  items,
  rowKey,
  pageSize = 20,
  emptyText,
  renderItem,
}: {
  items: T[];
  rowKey: (item: T) => string;
  pageSize?: number;
  emptyText: ReactNode;
  renderItem: (item: T) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const start = (page - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);

  if (!items.length) return <Empty description={emptyText} />;

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {pageItems.map((item) => (
        <div key={rowKey(item)}>{renderItem(item)}</div>
      ))}
      {items.length > pageSize && (
        <Pagination
          current={page}
          pageSize={pageSize}
          total={items.length}
          showSizeChanger={false}
          onChange={setPage}
          style={{ alignSelf: "center" }}
        />
      )}
    </Space>
  );
}
