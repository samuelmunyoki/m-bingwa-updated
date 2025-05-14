"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TokenBundle {
  _id: string;
  _creationTime: number;
  token_id: string;
  tokenBundleName: string;
  numberOfTokens: number;
  status: string;
}

interface TokenBundleCardProps {
  bundle: TokenBundle;
}

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const TokenBundleCard: React.FC<TokenBundleCardProps> = ({ bundle }) => {
  const isNew = Date.now() - bundle._creationTime < 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  return (
    <Card className="w-full overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            {bundle.tokenBundleName}
          </CardTitle>
          {isNew && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              New
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-200">
          {formatNumber(bundle.numberOfTokens)}
          <span className="text-lg font-normal ml-2 text-gray-600 dark:text-gray-400">
            Tokens
          </span>
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="default"
          className="w-full hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
        >
          Purchase
        </Button>
      </CardFooter>
    </Card>
  );
};

const ShopMain: React.FC = () => {
  const tokenBundlesQuery = useQuery(api.tokens.getAllTokenBundles);

  if (tokenBundlesQuery === undefined) {
   return (
     <div className="flex flex-col justify-center items-center w-full h-[200px]">
       <div className="flex flex-row gap-2 justify-center h-full items-center">
         <svg
           aria-hidden="true"
           className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500"
           viewBox="0 0 100 101"
           fill="none"
           xmlns="http://www.w3.org/2000/svg"
         >
           <path
             d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
             fill="currentColor"
           />
           <path
             d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
             fill="currentFill"
           />
         </svg>
         <span className="text-neutral-500 ">Loading ...</span>
       </div>
     </div>
   );
  }

  if (tokenBundlesQuery.status === "error") {
    return (
      <div className="text-destructive text-center">
        Error: {tokenBundlesQuery.message}
      </div>
    );
  }

  const activatedTokenBundles = tokenBundlesQuery.data.filter(
    (bundle: TokenBundle) => bundle.status === "available"
  );

  return (
    <div className="flex flex-1">
      <div className="rounded-lg bg-background flex flex-col gap-6 flex-1 w-full">
       
        <ScrollArea className="w-full h-[80%] lg:h-auto">
          {activatedTokenBundles.length > 0 ? (
            <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activatedTokenBundles.map((bundle: TokenBundle) => (
                <TokenBundleCard key={bundle.token_id} bundle={bundle} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-lg text-muted-foreground text-center">
                No token bundles available at the moment.
                <br />
                Please check back later.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ShopMain;
