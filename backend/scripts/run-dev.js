require('dotenv').config();

const path = require('path');
const { execFileSync, spawn } = require('child_process');

const backendDir = path.resolve(__dirname, '..');
const port = Number.parseInt(process.env.PORT || '5000', 10);
const healthUrl = `http://127.0.0.1:${port}/health`;

const getListeningPids = (listenPort) => {
  if (process.platform === 'win32') {
    const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
      encoding: 'utf8'
    });

    const pids = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/))
      .filter((parts) => parts[0] === 'TCP')
      .filter((parts) => parts[1].endsWith(`:${listenPort}`) && parts[3] === 'LISTENING')
      .map((parts) => Number.parseInt(parts[4], 10))
      .filter((pid) => Number.isInteger(pid));

    return [...new Set(pids)];
  }

  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${listenPort}`], {
      encoding: 'utf8'
    });

    return output
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid));
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
};

const isLocalBackendRunning = async () => {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(1500)
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload?.service === 'NFC Platform API';
  } catch {
    return false;
  }
};

const stopProcess = (pid) => {
  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore'
    });
    return;
  }

  process.kill(pid, 'SIGTERM');
};

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const waitForPortToClear = async (listenPort) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (getListeningPids(listenPort).length === 0) {
      return;
    }

    await wait(250);
  }

  throw new Error(`Port ${listenPort} is still busy after stopping the previous process.`);
};

const ensurePortAvailable = async (listenPort) => {
  const pids = getListeningPids(listenPort);
  if (pids.length === 0) {
    return;
  }

  const isBackendProcess = await isLocalBackendRunning();
  if (!isBackendProcess) {
    throw new Error(
      `Port ${listenPort} is already in use by another process. Stop it manually or set a different PORT.`
    );
  }

  for (const pid of pids) {
    if (pid !== process.pid) {
      console.log(`Stopping existing NFC backend on port ${listenPort} (PID ${pid})...`);
      stopProcess(pid);
    }
  }

  await waitForPortToClear(listenPort);
};

const startNodemon = () => {
  const nodemonEntrypoint = require.resolve('nodemon/bin/nodemon.js');
  const child = spawn(process.execPath, [nodemonEntrypoint, 'server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

const main = async () => {
  try {
    await ensurePortAvailable(port);
    startNodemon();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

main();