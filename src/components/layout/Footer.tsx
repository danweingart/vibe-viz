export function Footer() {
  return (
    <footer className="border-t border-border py-8 mt-12">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-foreground-muted">
            <span className="font-brice text-foreground">Good Vibes Club</span>{" "}
            Analytics Dashboard
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground-muted">
            <a
              href="https://opensea.io/collection/good-vibes-club"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              OpenSea
            </a>
            <a
              href="https://etherscan.io/address/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Etherscan
            </a>
            <a
              href="https://twitter.com/goodvibesclub"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-foreground-muted">
          Data provided by OpenSea API. Prices in USD via CoinGecko.
        </div>
      </div>
    </footer>
  );
}
