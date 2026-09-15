import { Redirect } from "expo-router";

// TODO(auth): once a persisted session is implemented, redirect to
// (student)/home or (parent)/home when already logged in.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
