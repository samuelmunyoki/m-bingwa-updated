import React from "react";
import { TokensTable } from "../_tables/tokens-table";
import ShopMain from "../shop/shop";

const TokensShop = () => {
  return (
    <div className="flex flex-1">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2">
        <h2 className="text-lg text-neutral-600 font-medium">
          Tokens Marketplace
        </h2>
        <div className="flex gap-2">
          <ShopMain />
        </div>
      </div>
    </div>
  );
};

export default TokensShop;
