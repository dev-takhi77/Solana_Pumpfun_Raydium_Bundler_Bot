import { Market } from "@openbook-dex/openbook";
import {
    calculateTotalAccountSize,
    EVENT_QUEUE_HEADER_SIZE,
    EVENT_SIZE,
    ORDERBOOK_HEADER_SIZE,
    ORDERBOOK_NODE_SIZE,
    REQUEST_QUEUE_HEADER_SIZE,
    REQUEST_SIZE,
} from "./base/orderbookUtils";
import { web3 } from "@project-serum/anchor";

type useSerumMarketAccountSizesProps = {
    eventQueueLength: number;
    requestQueueLength: number;
    orderbookLength: number;
};
export default function useSerumMarketAccountSizes({
    eventQueueLength,
    requestQueueLength,
    orderbookLength,
}: useSerumMarketAccountSizesProps, connection: web3.Connection, programID: web3.PublicKey) {
    const totalEventQueueSize = calculateTotalAccountSize(
        eventQueueLength,
        EVENT_QUEUE_HEADER_SIZE,
        EVENT_SIZE
    )

    const totalRequestQueueSize = calculateTotalAccountSize(
        requestQueueLength,
        REQUEST_QUEUE_HEADER_SIZE,
        REQUEST_SIZE
    )

    const totalOrderbookSize = calculateTotalAccountSize(
        orderbookLength,
        ORDERBOOK_HEADER_SIZE,
        ORDERBOOK_NODE_SIZE
    )
    // const useRentExemption = connection.getMinimumBalanceForRentExemption
    // const marketAccountRent = await useRentExemption(Market.getLayout(programID).span);
    // const eventQueueRent = await useRentExemption(totalEventQueueSize);
    // const requestQueueRent = await useRentExemption(totalRequestQueueSize);
    // const orderbookRent = await useRentExemption(totalOrderbookSize);

    return {
        // marketRent:
            // marketAccountRent + eventQueueRent + requestQueueRent + 2 * orderbookRent,
        marketRent: 0,
        totalEventQueueSize,
        totalRequestQueueSize,
        totalOrderbookSize,
    };
}