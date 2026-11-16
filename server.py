import http.server
import os

PORT = 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    server_address = ('0.0.0.0', PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, NoCacheHandler)
    print(f"Serving HTTP on 0.0.0.0 port {PORT} with ThreadingHTTPServer (no-cache enabled)...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()
