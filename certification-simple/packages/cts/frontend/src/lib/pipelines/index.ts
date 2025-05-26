import HolderPipeline from './holderPipeline';
import VerifierPipeline from './verifierPipeline';
import TRQPPipeline from './trqpPipeline';

export enum PipelineType {
  HOLDER = 'HOLDER',
  VERIFIER = 'VERIFIER',
  TRQP = 'TRQP',
}

export { HolderPipeline, VerifierPipeline, TRQPPipeline }; 