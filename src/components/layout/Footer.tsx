export function Footer() {
  return (
    <footer className="border-t border-gvc-border py-8 mt-12 relative z-10">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gvc-text-muted">
            <span className="font-brice text-gvc-text">Good Vibes Club</span>{" "}
            Analytics Dashboard
          </div>
          <div className="flex items-center gap-6 text-sm text-gvc-text-muted">
            <a
              href="https://opensea.io/collection/good-vibes-club"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gvc-text transition-colors"
            >
              OpenSea
            </a>
            <a
              href="https://etherscan.io/address/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gvc-text transition-colors"
            >
              Etherscan
            </a>
            <a
              href="https://twitter.com/goodvibesclub"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gvc-text transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gvc-text-muted">
          Data provided by OpenSea API. Prices in USD via CoinGecko.
        </div>
      </div>
    </footer>
  );
}
