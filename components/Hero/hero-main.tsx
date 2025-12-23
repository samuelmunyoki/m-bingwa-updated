import { IconBrandGithub } from "@tabler/icons-react";
import { Button, buttonVariants } from "../ui/button";
import { HeroCards } from "./hero-cards";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";


export const HeroMain = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const userData = useQuery(
      api.users.getUserById,
      isSignedIn ? { userId: user?.id } : "skip"
    );
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center px-10 lg:text-start lg:pl-10 space-y-6">
        <main className="text-5xl md:text-6xl font-bold leading-[60px] lg:leading-[70px] ">
          <h1 className="inline">Automation tool for</h1>{" "}
          <h2 className="inline">
            <span className="inline uppercase bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              Airtime, SMS & Bundles
            </span>{" "}
            Merchants
          </h2>
        </main>

        <p className="text-xl text-neutral-200 md:w-10/12 mx-auto lg:mx-0">
          Easily automate selling and delivery of your airtime, SMS and internet
          bundles in lightning speeds.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          {isSignedIn && userData ? (
            <Link
              href={`/dashboard/${user?.id}`}
              className={buttonVariants({
                className:
                  "h-10 w-60 bg-white !text-black hover:bg-black hover:!text-white",
              })}
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href={`/sign-in`}
              className={buttonVariants({
                className:
                  "h-10 w-60 bg-white !text-black hover:bg-black hover:!text-white",
              })}
            >
              Get Started
            </Link>
          )}
        </div>
      </div>

      {/* Hero cards sections */}
      <div className="z-10">
        <HeroCards />
      </div>

      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};
