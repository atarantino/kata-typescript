import type { DsaName } from "./scripts/dsa";

export interface LigmaConfig {
    dsa: DsaName[];
}

const config = {
    dsa: [
        "DFSOnBST",
        "LRU",
        "LinearSearchList",
        "BinarySearchList",
        "TwoCrystalBalls",
        "BubbleSort",
        "SinglyLinkedList",
        "DoublyLinkedList",
        "Queue",
        "Stack",
        "ArrayList",
        "MazeSolver",
        "QuickSort",
        "BTPreOrder",
        "BTInOrder",
        "BTPostOrder",
        "BTBFS",
        "CompareBinaryTrees",
        "DFSOnBST",
        "DFSGraphList",
        "Trie",
        "BFSGraphMatrix",
        "Map",
        "MinHeap",
    ],
} satisfies LigmaConfig;

export default config;
