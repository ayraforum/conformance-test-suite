{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  # Provide only the specific tools needed for testing
  buildInputs = [
    pkgs.nodejs-18_x
    pkgs.docker-compose
  ];

  shellHook = ''
    # Install pnpm globally if it's not present
    if ! command -v pnpm >/dev/null 2>&1; then
      echo "pnpm not found. Installing pnpm globally..."
    fi
    echo "Fresh, isolated Nix shell environment ready."
  '';
}
