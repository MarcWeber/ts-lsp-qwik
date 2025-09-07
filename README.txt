qwik lsp server
================
- route (validation and completion)


USAGE:
=========
local lspconfig = require'lspconfig'
local configs = require "lspconfig.configs"

if not configs.tsgo then
 configs.qwk = {
   default_config = {
     cmd = { "npm", vim.env.MR_ts .. "ts-lsp-qwik/dist/lsp.js" },
     filetypes = {
       "javascript",
       "javascriptreact",
       "typescript",
       "typescriptreact",
       -- "javascript.jsx",
       -- "typescript.tsx",
     },
     root_dir = lspconfig.util.root_pattern(
       "tsconfig.json",
       "jsconfig.json",
       "package.json",
       ".git",
       "tsconfig.base.json"
     ),
     settings = {},
   },
 }
end
require('lspconfig').qwik.setup { capabilities =  require('cmp_nvim_lsp').default_capabilities()}
