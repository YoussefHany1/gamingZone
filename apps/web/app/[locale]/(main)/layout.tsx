import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function MainLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  return (
    <>
      <Header />
      <div className="grow flex flex-col w-full">{props.children}</div>
      <Footer locale={locale} />
    </>
  );
}
