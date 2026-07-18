import { Provider } from "react-redux";
import { AppRouter } from "./router";
import { store } from "./store";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <Provider store={store}>
      <AppRouter />
      <Toaster position="bottom-right" richColors closeButton />
    </Provider>
  );
}

export default App;
