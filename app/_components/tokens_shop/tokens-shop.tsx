import React from "react";
import { TokensTable } from "../_tables/tokens-table";
import ShopMain from "../shop/shop";

const TokensShop = () => {
  return (
    <div className="flex flex-1">
      <div className="p-6 md:p-10  bg-white flex flex-col gap-2 flex-1 w-full">
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
