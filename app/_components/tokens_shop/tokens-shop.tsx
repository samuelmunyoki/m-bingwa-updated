import React from "react";
import { TokensTable } from "../_tables/tokens-table";
import ShopMain from "../shop/shop";

const TokensShop = () => {
  return (
    <div className="flex flex-1">
      <div className="page-container gap-2">
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
