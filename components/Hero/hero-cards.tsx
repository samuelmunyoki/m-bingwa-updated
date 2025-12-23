
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Check, Linkedin } from "lucide-react";
import { LightBulbIcon } from "./icons";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { IconBrandGithub } from "@tabler/icons-react";

export const HeroCards = () => {
  return (
    <div className="flex flex-col items-center lg:items-stretch w-full lg:w-[700px] h-auto lg:h-[500px] relative px-4 md:px-6 lg:px-0 space-y-4 lg:space-y-0">
      <Card className="relative lg:absolute  lg:-top-[15px] w-full max-w-[340px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Avatar>
            <AvatarImage alt="" src="https://github.com/sihadcn.png" />
            <AvatarFallback className="bg-black text-white">SH</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <CardTitle className="text-lg">Brian Kim</CardTitle>
            <CardDescription>@brian_kim254e</CardDescription>
          </div>
        </CardHeader>

        <CardContent>Everything is so smooth!</CardContent>
      </Card>

      {/* Team */}
      <Card className="relative lg:absolute lg:right-[20px] lg:top-4 w-full max-w-[320px] flex flex-col justify-center items-center drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="flex justify-center items-center pb-2">
          {/* <img
            src="https://i.pravatar.cc/150?img=58"
            alt="user avatar"
            className="absolute grayscale-[0%]  rounded-full w-24 h-24 aspect-square object-cover"
          /> */}
          <CardTitle className="text-center">Leo Mutinda</CardTitle>
          <CardDescription className="afont-normal text-primary">
            Bingwa Sokoni agent
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center pb-2 text-sm text-muted-foreground">
          <p>
            Nimeincrease sales zangu na M-Bingwa! Recommending this ownsome servce to everyone.
          </p>
        </CardContent>

        <CardFooter>
         
        </CardFooter>
      </Card>

      {/* Pricing */}
      <Card className="relative lg:absolute lg:top-[150px] lg:left-[50px] w-full max-w-[288px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader>
          <CardTitle className="flex item-center justify-between">
           Subscription
            <Badge variant="secondary" className="text-sm text-primary">
              Most popular
            </Badge>
          </CardTitle>
          <div>
            <span className="text-3xl font-bold">KES 0</span>
            <span className="text-muted-foreground"> /month</span>
          </div>

          <CardDescription>
            Creating and managing store.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button className="w-full">Start Free</Button>
        </CardContent>

        <hr className="w-4/5 m-auto mb-4" />

        <CardFooter className="flex">
          <div className="space-y-4">
            {["Free store", "Custom subdomain", "Automated M-Pesa pay."].map(
              (benefit: string) => (
                <span key={benefit} className="flex">
                  <Check className="text-green-500" />{" "}
                  <h4 className="ml-2">{benefit}</h4>
                </span>
              )
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Service */}
      <Card className="relative lg:absolute lg:-right-[10px] lg:bottom-[120px] w-full max-w-[350px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
          <div className="mt-1 bg-primary/20 p-1 rounded-2xl">
            <LightBulbIcon />
          </div>
          <div>
            <CardTitle>Creativity</CardTitle>
            <CardDescription className="text-sm mt-2">
              Build and deploy your store on a customr subdomain for free.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
