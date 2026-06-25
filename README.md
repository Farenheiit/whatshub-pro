# WhatsHub

Hub desktop para múltiplas contas de WhatsApp Web.

## O que esta versão entrega

- Electron atualizado via `electron@latest`.
- React + TypeScript + Vite.
- Electron Forge para empacotar no Windows.
- Sessões persistentes em pasta fixa:

```text
C:\Users\SEU_USUARIO\AppData\Roaming\WhatsHub
```

- Cada conta usa uma partição própria:

```text
persist:whatshub-ID_DA_CONTA
```

- As abas ficam carregadas ao mesmo tempo; trocar de conta apenas muda a visibilidade.
- Configurações salvas em JSON, sem `electron-store`.

## Como rodar no Windows

1. Instale Node.js LTS.
2. Extraia este projeto.
3. Clique duas vezes em:

```text
rodar-dev-windows.bat
```

Ou rode manualmente:

```cmd
npm install
npm run dev
```

## Como gerar o executável

Clique duas vezes em:

```text
gerar-exe-windows.bat
```

O resultado fica em:

```text
out\make
```

## Backup das conexões

Faça backup da pasta:

```text
C:\Users\SEU_USUARIO\AppData\Roaming\WhatsHub
```

Ela contém configurações e sessões persistentes das contas.

## Observação importante

O WhatsApp Web pode mudar seus critérios de compatibilidade. Por isso este projeto usa `electron@latest` e define um User-Agent moderno de Chrome no Windows.
"# whatshub-pro" 
