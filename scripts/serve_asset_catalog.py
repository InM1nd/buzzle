#!/usr/bin/env python3
"""Persistent local entry point for the art collection; no public deployment."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Lock
import webbrowser
from art_asset_catalog import REPO, build, files

LOCK=Lock()

def refresh_if_changed(output):
    with LOCK:
        try:cache=json.loads((output/'.inventory-cache.json').read_text())
        except (OSError,ValueError):cache={}
        current={p.relative_to(REPO).as_posix():[p.stat().st_size,p.stat().st_mtime_ns] for p in files()}
        if current!={key:entry['sig'] for key,entry in cache.items()} or not (output/'catalog.json').exists():
            build(output)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0]=='/buzzle-style-board/catalog.json':
            try:refresh_if_changed(self.server.catalog_output)
            except Exception as exc:
                self.send_error(500,'Unable to refresh art inventory');print(exc,flush=True);return
        super().do_GET()

    def end_headers(self):
        if self.path.split('?')[0].endswith(('catalog.json','index.html','/buzzle-style-board/')):
            self.send_header('Cache-Control','no-store')
        super().end_headers()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=REPO.parents[1]/'outputs/buzzle-style-board');parser.add_argument('--port',type=int,default=8110);parser.add_argument('--open',action='store_true');args=parser.parse_args()
    url=f'http://127.0.0.1:{args.port}/buzzle-style-board/'
    refresh_if_changed(args.output)
    try:server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(args.output.parent)))
    except OSError:
        if args.open:webbrowser.open(url)
        raise SystemExit('Port is already in use. If the catalog is running, use '+url)
    server.catalog_output=args.output
    if args.open:webbrowser.open(url)
    print('Buzzle art collection: '+url,flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
