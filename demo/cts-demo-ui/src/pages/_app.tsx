// pages/_app.tsx
import BaseLayout from "@/layouts/BaseLayout";

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <BaseLayout>
            <Component {...pageProps} />
        </BaseLayout>
    );
}
