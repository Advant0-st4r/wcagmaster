// src/components/SignUpPage.tsx
import { SignUp } from '@clerk/clerk-react'

// Using Clerk's hosted UI component for signup
export default function SignUpPage() {
  // Clerk SignUp handles UI & flows
  return <SignUp path="/signup" routing="path" />
}
