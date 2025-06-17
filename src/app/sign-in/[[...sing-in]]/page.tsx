import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return(
  <div className="flex items-center justify-center  max-h-screen"> <SignIn />;</div>
  )
}
