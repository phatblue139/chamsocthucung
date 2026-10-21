export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css")) return { url: "data:text/javascript,export default {}", shortCircuit: true };
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
  return nextLoad(url, context);
}
