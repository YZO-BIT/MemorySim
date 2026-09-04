#pragma once

#include <string>

class BufferPage {
private:
    int pageId;
    std::string data;

public:
    BufferPage(int pageId = -1, const std::string& data = "")
        : pageId(pageId), data(data) {}

    int getPageId() const {
        return pageId;
    }

    const std::string& getData() const {
        return data;
    }

    void setData(const std::string& newData) {
        data = newData;
    }
};