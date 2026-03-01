// In-browser Solidity compilation using web-solc (WASM)
import { fetchAndLoadSolc } from 'web-solc';

export interface CompilationResult {
  abi: any[];
  bytecode: `0x${string}`;
}

export async function compileCareCoin(source: string): Promise<CompilationResult> {
  const solc = await fetchAndLoadSolc('0.8.20');

  const input = {
    language: 'Solidity',
    sources: {
      'CareCoin.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = await solc.compile(input);
  solc.stopWorker();

  const parsed = output as any;

  // Check for errors
  const errors = parsed.errors?.filter((e: any) => e.severity === 'error') ?? [];
  if (errors.length > 0) {
    const messages = errors.map((e: any) => e.formattedMessage || e.message).join('\n');
    throw new Error(`Solidity compilation failed:\n${messages}`);
  }

  // Find the CareCoin contract in output
  const contracts = parsed.contracts?.['CareCoin.sol'];
  if (!contracts) {
    throw new Error('No contracts found in compilation output');
  }

  const careCoin = contracts['CareCoin'];
  if (!careCoin) {
    throw new Error('CareCoin contract not found in compilation output');
  }

  const bytecodeObj = careCoin.evm?.bytecode?.object;
  if (!bytecodeObj) {
    throw new Error('No bytecode generated for CareCoin');
  }

  return {
    abi: careCoin.abi,
    bytecode: `0x${bytecodeObj}` as `0x${string}`,
  };
}
