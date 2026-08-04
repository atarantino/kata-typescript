export default function bs_list(haystack: number[], needle: number): boolean {

  let l = 0
  let r = haystack.length - 1

  while (l <= r) {
    let m = Math.floor((l + r) / 2)

    if (haystack[m] == needle) {
      return true
    }
    else if (needle > haystack[m]) {
      l = m + 1
    }
    else {
      r = m - 1
    }
  }

  return false

}
