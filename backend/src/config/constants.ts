export const AATH_PATH = process.env.AATH_PATH || "/home/davidpoltorak-io/Projects/gan-aath/";
export const DEFAULT_ARGS = [
  "run",
  "-d",
  "acapy",
  "-t", "@RFC0023,@RFC0453,@RFC0454,@CredFormat_JSON-LD,@DidMethod_key,@ProofType_Ed25519Signature2018",
  "-t", "~@Anoncreds",
  "-t", "@critical",
  "-t", "~@RFC0793",
  "-t", "~@RFC0434",
  "-t", "~@DidMethod_orb",
  "-t", "~@DidMethod_sov",
  "-t", "~@ProofType_BbsBls12381G2PubKey",
  "logs"
];
